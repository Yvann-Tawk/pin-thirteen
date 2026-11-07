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
import type { Program } from './codegen';
import { Vm, type ArduinoHost } from './vm';

type Lookup = { get(id: string): ComponentDefinition | undefined };

const PWM_PINS = new Set([3, 5, 6, 9, 10, 11]);
const HIGH_VOLTS = 3;

export class EducationalEngine implements SimulationEngine<Program>, ArduinoHost {
  readonly id = 'educational' as const;
  readonly capabilities = { languageSubset: true, cycleAccurate: false };
  private model!: CircuitModel;
  private solution: CircuitSolution | null = null;
  private program: Program | null = null;
  private vm: Vm | null = null;
  private running = false;
  private readonly listeners = new Set<(e: SimulationEvent) => void>();
  private readonly pins = new Map<number, PinDrive>();
  private readonly pressed = new Set<string>();
  private readonly turned = new Map<string, number>();
  private readonly notices = new Set<string>();
  private serialIn: number[] = [];
  private floatFlip = 0;

  constructor(private readonly registry: Lookup) {}

  private inputs(): Inputs {
    return { pins: this.pins, pressed: this.pressed, turned: this.turned };
  }

  private solved(): CircuitSolution {
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

  async loadProgram(program: Program) {
    this.program = program;
  }

  async start() {
    if (!this.vm) await this.reset();
    this.running = true;
  }

  async pause() {
    this.running = false;
  }

  async stop() {
    this.running = false;
    this.vm = null;
    this.pins.clear();
    this.solution = null;
  }

  async reset() {
    if (!this.program) throw new Error('Load a program first.');
    this.pins.clear();
    this.notices.clear();
    this.serialIn = [];
    this.solution = null;
    this.vm = new Vm(this.program, this);
  }

  advance(virtualMicros: number) {
    if (!this.running || !this.vm) return;
    this.vm.run(this.vm.micros + virtualMicros);
    if (this.vm.fault) this.running = false;
  }

  sendInput(input: ComponentInput) {
    if (input.kind === 'press') {
      if (input.pressed) this.pressed.add(input.instance);
      else this.pressed.delete(input.instance);
    } else {
      this.turned.set(input.instance, Math.min(1, Math.max(0, input.position)));
    }
    this.solution = null;
  }

  writeSerial(text: string) {
    for (let i = 0; i < text.length; i++) this.serialIn.push(text.charCodeAt(i) & 0xff);
  }

  getState(): SimulationState {
    const components: SimulationState['components'] = {};
    if (this.vm) {
      for (const d of this.solved().diodes) {
        components[d.instance] = { brightness: d.brightness, milliamps: d.milliamps };
      }
    }
    const pin13 = this.pins.get(13);
    return {
      running: this.running,
      virtualMicros: this.vm?.micros ?? 0,
      line: this.vm?.line ?? 0,
      components,
      builtinLed: pin13?.mode === 'output' ? (pin13.duty ?? pin13.level) : 0,
      fault: this.vm?.fault ?? null,
      notices: [...this.notices],
    };
  }

  subscribe(listener: (e: SimulationEvent) => void) {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  async dispose() {
    this.listeners.clear();
    this.vm = null;
  }

  // ArduinoHost: the only way a sketch reaches the circuit.

  pinMode(pin: number, mode: number) {
    const known = this.pins.get(pin);
    this.pins.set(pin, {
      mode: mode === 1 ? 'output' : mode === 2 ? 'pullup' : 'input',
      level: known?.level ?? 0,
    });
    this.solution = null;
  }

  digitalWrite(pin: number, value: number) {
    const known = this.pins.get(pin);
    if (!known || known.mode !== 'output') {
      this.notices.add(
        `Pin ${pin} was written before pinMode(${pin}, OUTPUT), so it stays an input.`,
      );
      this.pins.set(pin, { mode: value ? 'pullup' : 'input', level: value ? 1 : 0 });
    } else {
      this.pins.set(pin, { mode: 'output', level: value ? 1 : 0 });
    }
    this.solution = null;
  }

  digitalRead(pin: number): number {
    if (this.pins.get(pin)?.mode === 'output') return this.pins.get(pin)!.level;
    const volts = this.model.readPin(pin, this.solved(), this.pins.get(pin));
    if (volts === undefined) {
      this.notices.add(
        `Pin ${pin} is floating, so its reading is unpredictable. Add a pull-up or pull-down, or use INPUT_PULLUP.`,
      );
      this.floatFlip ^= 1;
      return this.floatFlip;
    }
    return volts >= HIGH_VOLTS ? 1 : 0;
  }

  analogRead(pin: number): number {
    const gpio = pin < 14 ? pin + 14 : pin;
    const volts = this.model.readPin(gpio, this.solved(), this.pins.get(gpio));
    if (volts === undefined) {
      this.notices.add(`Pin A${gpio - 14} is floating, so its reading is unpredictable.`);
      this.floatFlip = (this.floatFlip + 137) % 1024;
      return this.floatFlip;
    }
    return Math.min(1023, Math.round((volts / 5) * 1023));
  }

  analogWrite(pin: number, value: number) {
    const v = Math.min(255, Math.max(0, value));
    if (PWM_PINS.has(pin) && v > 0 && v < 255) {
      this.pins.set(pin, { mode: 'output', level: 1, duty: v / 255 });
    } else {
      if (!PWM_PINS.has(pin) && v > 0 && v < 255) {
        this.notices.add(
          `Pin ${pin} has no PWM, so analogWrite gives only HIGH or LOW. Use pin 3, 5, 6, 9, 10 or 11.`,
        );
      }
      this.pins.set(pin, { mode: 'output', level: v >= 128 ? 1 : 0 });
    }
    this.solution = null;
  }

  serialWrite(text: string) {
    for (const l of this.listeners) l({ type: 'serial', text });
  }

  serialAvailable() {
    return this.serialIn.length;
  }

  serialRead() {
    return this.serialIn.shift() ?? -1;
  }
}
