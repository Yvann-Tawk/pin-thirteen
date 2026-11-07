import type { CircuitDocument } from '@pin-thirteen/circuit-core';
import type { ComponentDefinition } from '@pin-thirteen/registry';
import {
  CircuitModel,
  type CircuitSolution,
  type ComponentInput,
  type Inputs,
  type PinDrive,
  type SimulationEngine,
  type SimulationEvent,
  type SimulationState,
} from '@pin-thirteen/sim-core';
import {
  adcConfig,
  AVRADC,
  AVRIOPort,
  AVRTimer,
  AVRUSART,
  avrInstruction,
  CPU,
  PinState,
  portBConfig,
  portCConfig,
  portDConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  usart0Config,
} from 'avr8js';

type Lookup = { get(id: string): ComponentDefinition | undefined };

const CLOCK_HZ = 16_000_000;
const CYCLES_PER_MICRO = CLOCK_HZ / 1_000_000;
const INPUT_REFRESH_CYCLES = 1600;

export function loadHex(hex: string): Uint16Array {
  const flash = new Uint8Array(0x8000);
  for (const line of hex.split('\n')) {
    if (line[0] !== ':' || line.slice(7, 9) !== '00') continue;
    const count = parseInt(line.slice(1, 3), 16);
    const address = parseInt(line.slice(3, 7), 16);
    for (let i = 0; i < count; i++)
      flash[address + i] = parseInt(line.slice(9 + i * 2, 11 + i * 2), 16);
  }
  return new Uint16Array(flash.buffer);
}

const PORTS = [
  { offset: 8, count: 6 },
  { offset: 14, count: 6 },
  { offset: 0, count: 8 },
];

/** Runs compiled code on an emulated ATmega328P. External parts use the same circuit model. */
export class AvrEngine implements SimulationEngine<string> {
  readonly id = 'avr' as const;
  readonly capabilities = { languageSubset: false, cycleAccurate: true };
  private model!: CircuitModel;
  private cpu: CPU | null = null;
  private ports: AVRIOPort[] = [];
  private adc: AVRADC | null = null;
  private usart: AVRUSART | null = null;
  private hex = '';
  private running = false;
  private solution: CircuitSolution | null = null;
  private readonly listeners = new Set<(e: SimulationEvent) => void>();
  private readonly pins = new Map<number, PinDrive>();
  private readonly pressed = new Set<string>();
  private readonly turned = new Map<string, number>();
  private readonly channels = new Map<string, number>();
  private readonly notices = new Set<string>();
  /** Time each pin has spent HIGH since the last state read, to average PWM. */
  private readonly high = new Map<number, { since: number; total: number; edges: number }>();
  private windowStart = 0;
  private nextRefresh = 0;

  constructor(private readonly registry: Lookup) {}

  private inputs(): Inputs {
    return { pins: this.pins, pressed: this.pressed, turned: this.turned, channels: this.channels };
  }

  private solved() {
    this.solution ??= this.model.solve(this.inputs());
    return this.solution;
  }

  async initialize(circuit: CircuitDocument) {
    this.updateCircuit(circuit);
  }

  updateCircuit(circuit: CircuitDocument) {
    this.model = new CircuitModel(circuit, this.registry);
    this.solution = null;
  }

  async loadProgram(hex: string) {
    this.hex = hex;
  }

  async reset() {
    const cpu = new CPU(loadHex(this.hex));
    this.cpu = cpu;
    this.pins.clear();
    this.high.clear();
    this.notices.clear();
    this.solution = null;
    new AVRTimer(cpu, timer0Config);
    new AVRTimer(cpu, timer1Config);
    new AVRTimer(cpu, timer2Config);
    this.ports = [portBConfig, portCConfig, portDConfig].map((c) => new AVRIOPort(cpu, c));
    this.ports.forEach((port, i) => port.addListener(() => this.portChanged(i)));
    const adc = new AVRADC(cpu, adcConfig);
    adc.onADCRead = (input) => {
      const channel = 'channel' in input ? input.channel : 0;
      const volts = this.model.readPin(14 + channel, this.solved(), this.pins.get(14 + channel));
      if (volts === undefined)
        this.notices.add(`Pin A${channel} is floating, so its reading is unpredictable.`);
      const value = volts === undefined ? 512 : Math.min(1023, Math.round((volts / 5) * 1023));
      cpu.addClockEvent(() => adc.completeADCRead(value), adc.sampleCycles);
    };
    this.adc = adc;
    const usart = new AVRUSART(cpu, usart0Config, CLOCK_HZ);
    usart.onByteTransmit = (byte) => {
      for (const l of this.listeners) l({ type: 'serial', text: String.fromCharCode(byte) });
    };
    this.usart = usart;
    this.windowStart = 0;
    this.nextRefresh = 0;
  }

  private portChanged(index: number) {
    const { offset, count } = PORTS[index]!;
    const port = this.ports[index]!;
    const now = this.cpu!.cycles;
    for (let bit = 0; bit < count; bit++) {
      const gpio = offset + bit;
      const state = port.pinState(bit);
      const output = state === PinState.Low || state === PinState.High;
      const level = state === PinState.High ? 1 : 0;
      const known = this.pins.get(gpio);
      const mode = output ? 'output' : state === PinState.InputPullUp ? 'pullup' : 'input';
      if (known?.mode === mode && known.level === level) continue;
      const track = this.high.get(gpio) ?? { since: now, total: 0, edges: 0 };
      if (known?.level === 1) track.total += now - track.since;
      track.since = now;
      track.edges += 1;
      this.high.set(gpio, track);
      this.pins.set(gpio, { mode, level });
      this.solution = null;
    }
  }

  private refreshInputs() {
    const solution = this.solved();
    PORTS.forEach(({ offset, count }, index) => {
      for (let bit = 0; bit < count; bit++) {
        const gpio = offset + bit;
        const drive = this.pins.get(gpio);
        if (drive?.mode === 'output') continue;
        const volts = this.model.readPin(gpio, solution, drive);
        if (volts !== undefined) this.ports[index]!.setPin(bit, volts >= 3);
      }
    });
  }

  async start() {
    if (!this.cpu) await this.reset();
    this.running = true;
  }

  async pause() {
    this.running = false;
  }

  async stop() {
    this.running = false;
    this.cpu = null;
    this.pins.clear();
  }

  advance(virtualMicros: number) {
    const cpu = this.cpu;
    if (!cpu || !this.running) return;
    const end = cpu.cycles + virtualMicros * CYCLES_PER_MICRO;
    while (cpu.cycles < end) {
      if (cpu.cycles >= this.nextRefresh) {
        this.refreshInputs();
        this.nextRefresh = cpu.cycles + INPUT_REFRESH_CYCLES;
      }
      avrInstruction(cpu);
      cpu.tick();
    }
  }

  sendInput(input: ComponentInput) {
    if (input.kind === 'press') {
      if (input.pressed) this.pressed.add(input.instance);
      else this.pressed.delete(input.instance);
    } else if (input.kind === 'channel') {
      this.channels.set(`${input.instance}:${input.channel}`, input.value);
    } else {
      this.turned.set(input.instance, Math.min(1, Math.max(0, input.position)));
    }
    this.solution = null;
  }

  writeSerial(text: string) {
    for (let i = 0; i < text.length; i++) this.usart?.writeByte(text.charCodeAt(i) & 0xff);
  }

  /** Averages fast switching over the last window, which is how PWM reaches the LED. */
  private measureDuty() {
    const cpu = this.cpu!;
    const span = cpu.cycles - this.windowStart;
    if (span <= 0) return;
    for (const [gpio, track] of this.high) {
      const drive = this.pins.get(gpio);
      if (!drive) continue;
      const total = track.total + (drive.level ? cpu.cycles - track.since : 0);
      if (track.edges > 4) drive.duty = Math.min(1, total / span);
      else delete drive.duty;
      track.total = 0;
      track.edges = 0;
      track.since = cpu.cycles;
    }
    this.windowStart = cpu.cycles;
    this.solution = null;
  }

  getState(): SimulationState {
    const components: SimulationState['components'] = {};
    if (this.cpu) {
      this.measureDuty();
      for (const d of this.solved().diodes) {
        components[d.instance] = { brightness: d.brightness, milliamps: d.milliamps };
      }
    }
    const pin13 = this.pins.get(13);
    return {
      running: this.running,
      virtualMicros: (this.cpu?.cycles ?? 0) / CYCLES_PER_MICRO,
      line: 0,
      components,
      builtinLed: pin13?.mode === 'output' ? (pin13.duty ?? pin13.level) : 0,
      fault: null,
      notices: [...this.notices],
    };
  }

  subscribe(listener: (e: SimulationEvent) => void) {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  async dispose() {
    this.listeners.clear();
    this.cpu = null;
  }
}
