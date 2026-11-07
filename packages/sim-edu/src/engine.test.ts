import type { CircuitDocument, ComponentInstance, Wire } from '@pin-thirteen/circuit-core';
import { registry } from '@pin-thirteen/registry';
import { describe, expect, it } from 'vitest';
import { compile, EducationalEngine } from './index';

const part = (id: string, type: string, params = {}): ComponentInstance => ({
  id,
  type,
  position: { x: 0, y: 0 },
  rotation: 0,
  params,
});
const wire = (a: string, b: string): Wire => {
  const [ai, ap] = a.split('.') as [string, string];
  const [bi, bp] = b.split('.') as [string, string];
  return {
    id: a + b,
    from: { instance: ai, pin: ap },
    to: { instance: bi, pin: bp },
    style: { colour: 'mint' },
  };
};
const uno = part('u', 'uno-r3');
const R = part('r', 'resistor', { resistanceOhms: 220 });
const L = part('l', 'led-5mm');
const BLINK =
  'void setup(){ pinMode(13, OUTPUT); } void loop(){ digitalWrite(13, HIGH); delay(1000); digitalWrite(13, LOW); delay(1000); }';
const LED_WIRES = [wire('u.D13', 'r.a'), wire('r.b', 'l.anode'), wire('l.cathode', 'u.GND_1')];
const doc = (components: ComponentInstance[], wires: Wire[]): CircuitDocument => ({
  components,
  wires,
});

async function run(source: string, circuit: CircuitDocument) {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics[0]?.message);
  const engine = new EducationalEngine(registry);
  await engine.initialize(circuit);
  await engine.loadProgram(result.program);
  await engine.start();
  return engine;
}
const lit = (e: EducationalEngine) => (e.getState().components.l?.brightness ?? 0) > 0;

describe('LED depends on circuit and code', () => {
  it('blinks when wired correctly, with a plausible current', async () => {
    const e = await run(BLINK, doc([uno, R, L], LED_WIRES));
    e.advance(500_000);
    expect(lit(e)).toBe(true);
    expect(e.getState().components.l?.milliamps).toBeCloseTo(((5 - 2) / 245) * 1000, 0);
    e.advance(1_000_000);
    expect(lit(e)).toBe(false);
    e.advance(1_000_000);
    expect(lit(e)).toBe(true);
  });
  it('stays dark when the same sketch has a missing wire', async () => {
    const e = await run(BLINK, doc([uno, R, L], LED_WIRES.slice(0, 2)));
    e.advance(500_000);
    expect(lit(e)).toBe(false);
  });
  it('stays dark when reversed', async () => {
    const reversed = [wire('u.D13', 'r.a'), wire('r.b', 'l.cathode'), wire('l.anode', 'u.GND_1')];
    const e = await run(BLINK, doc([uno, R, L], reversed));
    for (let i = 0; i < 5; i++) {
      e.advance(500_000);
      expect(lit(e)).toBe(false);
    }
  });
  it('stays dark on the wrong pin', async () => {
    const e = await run(BLINK, doc([uno, R, L], [wire('u.D12', 'r.a'), ...LED_WIRES.slice(1)]));
    e.advance(500_000);
    expect(lit(e)).toBe(false);
  });
  it('stops responding when a wire is removed mid-run, and recovers', async () => {
    const whole = doc([uno, R, L], LED_WIRES);
    const e = await run(BLINK, whole);
    e.advance(500_000);
    expect(lit(e)).toBe(true);
    e.updateCircuit(doc([uno, R, L], LED_WIRES.slice(0, 2)));
    expect(lit(e)).toBe(false);
    e.updateCircuit(whole);
    expect(lit(e)).toBe(true);
  });
  it('sketch without output leaves a wired LED dark', async () => {
    const e = await run('void setup(){} void loop(){}', doc([uno, R, L], LED_WIRES));
    e.advance(100_000);
    expect(lit(e)).toBe(false);
  });
});

describe('inputs through the circuit', () => {
  const B = part('b', 'push-button');
  const P = part('p', 'potentiometer', { ohms: 10000 });
  it('reads a button with INPUT_PULLUP, and a floating pin raises a notice', async () => {
    const src =
      'void setup(){ pinMode(2, INPUT_PULLUP); pinMode(13, OUTPUT); } void loop(){ digitalWrite(13, digitalRead(2) == LOW ? HIGH : LOW); }';
    const e = await run(
      src,
      doc([uno, B, R, L], [wire('u.D2', 'b.a1'), wire('b.b1', 'u.GND_1'), ...LED_WIRES]),
    );
    e.advance(5000);
    expect(lit(e)).toBe(false);
    e.sendInput({ instance: 'b', kind: 'press', pressed: true });
    e.advance(5000);
    expect(lit(e)).toBe(true);
    const f = await run(
      'void setup(){ pinMode(2, INPUT); Serial.print(digitalRead(2)); } void loop(){}',
      doc([uno], []),
    );
    f.advance(1000);
    expect(f.getState().notices[0]).toContain('floating');
  });
  it('reads a potentiometer through analogRead, and prints it', async () => {
    const circuit = doc(
      [uno, P],
      [wire('u.5V', 'p.a'), wire('p.b', 'u.GND_1'), wire('p.wiper', 'u.A0')],
    );
    const e = await run(
      'void setup(){ Serial.begin(9600); } void loop(){ Serial.println(analogRead(A0)); delay(100); }',
      circuit,
    );
    let text = '';
    e.subscribe((m) => void (m.type === 'serial' && (text += m.text)));
    e.sendInput({ instance: 'p', kind: 'turn', position: 0.25 });
    e.advance(50_000);
    expect(text.trim()).toBe('767');
  });
  it('dims with PWM and refuses it on a non-PWM pin', async () => {
    const pwm = doc(
      [uno, R, L],
      [wire('u.D9', 'r.a'), wire('r.b', 'l.anode'), wire('l.cathode', 'u.GND_1')],
    );
    const on = await run('void setup(){ analogWrite(9, 255); } void loop(){}', pwm);
    const half = await run('void setup(){ analogWrite(9, 64); } void loop(){}', pwm);
    on.advance(1000);
    half.advance(1000);
    const b = (e: EducationalEngine) => e.getState().components.l!.brightness;
    expect(b(half)).toBeCloseTo(b(on) * (64 / 255), 3);
    const none = await run('void setup(){ analogWrite(8, 64); } void loop(){}', doc([uno], []));
    none.advance(1000);
    expect(none.getState().notices[0]).toContain('no PWM');
  });
});
