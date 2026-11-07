import { describe, expect, it } from 'vitest';
import { registry, Registry } from './index';

// Every new component gets these checks automatically.
describe.each(registry.all().map((d) => [d.id, d] as const))('%s', (_, definition) => {
  it('has unique pins with usable positions', () => {
    const ids = definition.pins.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
    for (const pin of definition.pins) {
      expect(Number.isFinite(pin.position.x) && Number.isFinite(pin.position.y)).toBe(true);
    }
  });

  it('declares support for each engine and has teaching text', () => {
    expect(Object.keys(definition.simulation).sort()).toEqual(['avr', 'educational']);
    expect(definition.description.length).toBeGreaterThan(10);
  });
});

describe('UNO R3 pins', () => {
  const uno = registry.get('uno-r3')!;
  it('has all digital and analog pins', () => {
    for (let n = 0; n <= 13; n++) expect(uno.pins.some((p) => p.id === `D${n}`)).toBe(true);
    for (let n = 0; n <= 5; n++) expect(uno.pins.some((p) => p.id === `A${n}`)).toBe(true);
  });
  it('marks exactly the six hardware PWM pins', () => {
    const pwm = uno.pins
      .filter((p) => p.pwm)
      .map((p) => p.id)
      .sort();
    expect(pwm).toEqual(['D10', 'D11', 'D3', 'D5', 'D6', 'D9']);
  });
});

it('rejects duplicate definitions', () => {
  const [first] = registry.all();
  expect(() => new Registry([first!, first!])).toThrow();
});
