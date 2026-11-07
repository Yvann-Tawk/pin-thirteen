import type { CircuitDocument, ComponentInstance, Wire } from '@pin-thirteen/circuit-core';
import { registry } from '@pin-thirteen/registry';
import { compile } from '@pin-thirteen/sim-edu';
import { describe, expect, it } from 'vitest';
import {
  evaluate,
  LESSONS,
  lessonPassed,
  noObservations,
  STEP_KINDS,
  type Observed,
} from './index';

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
const led = (pin: string): CircuitDocument => ({
  components: [uno, R, L],
  wires: [wire(`u.${pin}`, 'r.a'), wire('r.b', 'l.anode'), wire('l.cathode', 'u.GND_1')],
});
const reversed: CircuitDocument = {
  components: [uno, R, L],
  wires: [wire('u.D13', 'r.a'), wire('r.b', 'l.cathode'), wire('l.anode', 'u.GND_1')],
};
const ctx = (doc: CircuitDocument, sketch: string, observed: Partial<Observed> = {}) => ({
  doc,
  sketch,
  registry,
  observed: { ...noObservations(), ...observed },
});
const lesson = (id: string) => LESSONS.find((l) => l.id === id)!;

describe.each(LESSONS.map((l) => [l.id, l] as const))('%s', (_, l) => {
  it('has all eight steps in order', () =>
    expect(l.steps.map((s) => s.kind)).toEqual([...STEP_KINDS]));
  it('uses only registered parts', () => {
    for (const p of l.parts) expect(registry.get(p)).toBeDefined();
  });
  it('has a verifiable objective', () => expect(l.verify.length).toBeGreaterThan(0));
  it('ships a sketch the simulator can run', () => {
    if (l.sketch) expect(compile(l.sketch).ok).toBe(true);
  });
});

describe('lesson verification', () => {
  it('passes Blink only after a correct circuit really blinked', () => {
    const b = lesson('blink');
    const s = b.sketch!;
    expect(lessonPassed(b, ctx(led('D13'), s, { ledTransitions: 4 }))).toBe(true);
    expect(lessonPassed(b, ctx(led('D13'), s, { ledTransitions: 0 }))).toBe(false);
    expect(lessonPassed(b, ctx(led('D12'), s, { ledTransitions: 4 }))).toBe(false);
    expect(lessonPassed(b, ctx(reversed, s, { ledTransitions: 4 }))).toBe(false);
    expect(
      lessonPassed(
        b,
        ctx(led('D13'), '// digitalWrite(\nvoid setup(){} void loop(){}', { ledTransitions: 4 }),
      ),
    ).toBe(false);
  });
  it('accepts any valid resistor value and wire order', () => {
    const alt: CircuitDocument = {
      components: [uno, part('r', 'resistor', { resistanceOhms: 330 }), L],
      wires: [
        wire('u.D13', 'l.anode'),
        wire('l.cathode', 'r.b'),
        wire('r.a', 'u.GND_top'.replace('top', 'TOP')),
      ],
    };
    expect(lessonPassed(lesson('first-led'), ctx(alt, ''))).toBe(true);
  });
  it('fails the first LED lesson for a reversed LED', () => {
    expect(lessonPassed(lesson('first-led'), ctx(reversed, ''))).toBe(false);
  });
  it('checks potentiometer wiring and varied readings', () => {
    const p = part('p', 'potentiometer', { ohms: 10000 });
    const good: CircuitDocument = {
      components: [uno, p],
      wires: [wire('u.5V', 'p.a'), wire('p.b', 'u.GND_1'), wire('p.wiper', 'u.A0')],
    };
    const l = lesson('potentiometer');
    expect(lessonPassed(l, ctx(good, l.sketch!, { serial: '100\r\n200\r\n' }))).toBe(true);
    expect(lessonPassed(l, ctx(good, l.sketch!, { serial: '100\r\n100\r\n' }))).toBe(false);
    expect(
      lessonPassed(l, ctx({ components: [uno, p], wires: [] }, l.sketch!, { serial: '1 2' })),
    ).toBe(false);
  });
  it('checks PWM on pin 9', () => {
    const l = lesson('pwm');
    expect(lessonPassed(l, ctx(led('D9'), l.sketch!, { brightnessLevels: 5 }))).toBe(true);
    expect(lessonPassed(l, ctx(led('D13'), l.sketch!, { brightnessLevels: 5 }))).toBe(false);
  });
  it('reads a check on its own', () => {
    expect(
      evaluate({ type: 'sim.serialPrinted', label: '' }, ctx(led('D13'), '', { serial: 'hi' })),
    ).toBe(true);
  });
});
