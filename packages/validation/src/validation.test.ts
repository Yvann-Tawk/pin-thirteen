import type { CircuitDocument, ComponentInstance, Wire } from '@pin-thirteen/circuit-core';
import { registry } from '@pin-thirteen/registry';
import { describe, expect, it } from 'vitest';
import { validate } from './index';

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
const circuit = (extra: ComponentInstance[], wires: Wire[]): CircuitDocument => ({
  components: [part('u', 'uno-r3'), ...extra],
  wires,
});
const R = part('r', 'resistor', { resistanceOhms: 220 });
const L = part('l', 'led-5mm');
const ids = (doc: CircuitDocument) => validate(doc, registry).map((f) => f.id);

describe('validation', () => {
  it('passes a correct LED circuit', () => {
    expect(
      ids(
        circuit(
          [R, L],
          [wire('u.D13', 'r.a'), wire('r.b', 'l.anode'), wire('l.cathode', 'u.GND_1')],
        ),
      ),
    ).toEqual(['model-simplified']);
  });
  it('flags a power short as an error', () => {
    const f = validate(circuit([], [wire('u.5V', 'u.GND_1')]), registry);
    expect(f[0]).toMatchObject({ id: 'power-short', severity: 'error' });
  });
  it('flags a missing resistor as a hazard, not an error', () => {
    const f = validate(
      circuit([L], [wire('u.D13', 'l.anode'), wire('l.cathode', 'u.GND_1')]),
      registry,
    );
    expect(f[0]).toMatchObject({ id: 'led-no-resistor', severity: 'hazard' });
  });
  it('flags a reversed LED on a fixed supply and on a pin', () => {
    expect(
      ids(
        circuit(
          [R, L],
          [wire('u.5V', 'r.a'), wire('r.b', 'l.cathode'), wire('l.anode', 'u.GND_1')],
        ),
      ),
    ).toContain('led-reversed');
    expect(
      ids(
        circuit(
          [R, L],
          [wire('u.D13', 'r.a'), wire('r.b', 'l.cathode'), wire('l.anode', 'u.GND_1')],
        ),
      ),
    ).toContain('led-reversed');
  });
  it('flags missing ground and disconnected parts', () => {
    expect(ids(circuit([R, L], [wire('u.D13', 'r.a'), wire('r.b', 'l.anode')]))).toContain(
      'missing-ground',
    );
    expect(ids(circuit([L], []))).toContain('disconnected');
    expect(ids(circuit([R], [wire('u.D13', 'r.a')]))).toContain('disconnected');
  });
  it('always states the model limitation', () => {
    expect(ids(circuit([], []))).toContain('model-simplified');
  });
});
