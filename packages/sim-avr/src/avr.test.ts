import type { CircuitDocument, ComponentInstance, Wire } from '@pin-thirteen/circuit-core';
import { registry } from '@pin-thirteen/registry';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileWithGcc, parseGccErrors, toCpp, type LoadTool } from './compiler';
import { AvrEngine, loadHex } from './engine';

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

describe('compiler helpers', () => {
  it('adds prototypes and maps lines back to the sketch', () => {
    const cpp = toCpp('int twice(int a) {\n  return a * 2;\n}\n');
    expect(cpp).toContain('int twice(int a);');
    expect(cpp).toContain('#line 1 "sketch.ino"');
  });
  it('reads gcc errors', () => {
    expect(parseGccErrors(["sketch.ino:3:5: error: 'x' was not declared in this scope"])).toEqual([
      { line: 3, message: "'x' was not declared in this scope" },
    ]);
  });
  it('loads Intel HEX words', () => {
    expect(loadHex(':020000000C94\n:00000001FF\n')[0]).toBe(0x940c);
  });
});

// The GPL toolchain is not in this repository. These run when a local build is present.
const out =
  process.env.PIN13_TOOLCHAIN ??
  join(import.meta.dirname, '../../../../arduino-playground-spike/wasm-build/out');
const have = existsSync(join(out, 'cc1plus.wasm'));

describe.skipIf(!have)('real compiled sketches on avr8js', () => {
  const bundle = have
    ? (JSON.parse(readFileSync(join(out, 'bundle.json'), 'utf8')) as Record<string, string>)
    : {};
  const load: LoadTool = async (name, options) =>
    (await import(/* @vite-ignore */ join(out, `${name}.mjs`))).default(options);
  const build = async (src: string) => {
    const r = await compileWithGcc(src, bundle, load);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    return r.hex;
  };
  const uno = part('u', 'uno-r3');
  const R = part('r', 'resistor', { resistanceOhms: 220 });
  const L = part('l', 'led-5mm');
  const LED = (pin: string): CircuitDocument => ({
    components: [uno, R, L],
    wires: [wire(`u.${pin}`, 'r.a'), wire('r.b', 'l.anode'), wire('l.cathode', 'u.GND_1')],
  });
  const start = async (hex: string, doc: CircuitDocument) => {
    const e = new AvrEngine(registry);
    await e.initialize(doc);
    await e.loadProgram(hex);
    await e.start();
    return e;
  };
  const b = (e: AvrEngine) => e.getState().components.l?.brightness ?? 0;

  it('blinks only with a complete circuit, and responds to a pulled wire', async () => {
    const hex = await build(
      'void setup(){ pinMode(13, OUTPUT); } void loop(){ digitalWrite(13, HIGH); delay(100); digitalWrite(13, LOW); delay(100); }',
    );
    const e = await start(hex, LED('D13'));
    e.advance(50_000);
    expect(b(e)).toBeGreaterThan(0);
    e.advance(100_000);
    expect(b(e)).toBe(0);
    e.advance(100_000);
    expect(b(e)).toBeGreaterThan(0);
    e.updateCircuit({ ...LED('D13'), wires: LED('D13').wires.slice(0, 2) });
    expect(b(e)).toBe(0);
  }, 20000);

  it('reports compile errors on the sketch line', async () => {
    const r = await compileWithGcc(
      'void setup() {\n  nothing();\n}\nvoid loop() {}\n',
      bundle,
      load,
    );
    expect(r).toMatchObject({ ok: false, errors: [{ line: 2 }] });
  }, 20000);

  it('reads a button through INPUT_PULLUP', async () => {
    const hex = await build(
      'void setup(){ pinMode(2, INPUT_PULLUP); pinMode(13, OUTPUT); } void loop(){ digitalWrite(13, digitalRead(2) == LOW ? HIGH : LOW); }',
    );
    const B = part('b', 'push-button');
    const doc = LED('D13');
    const e = await start(hex, {
      components: [...doc.components, B],
      wires: [...doc.wires, wire('u.D2', 'b.a1'), wire('b.b1', 'u.GND_1')],
    });
    e.advance(30_000);
    expect(b(e)).toBe(0);
    e.sendInput({ instance: 'b', kind: 'press', pressed: true });
    e.advance(30_000);
    expect(b(e)).toBeGreaterThan(0);
  }, 20000);

  it('reads analog input, and averages real PWM', async () => {
    const P = part('p', 'potentiometer', { ohms: 10000 });
    const hex = await build(
      'void setup(){ Serial.begin(115200); Serial.println(analogRead(A0)); analogWrite(9, 64); } void loop(){}',
    );
    const doc = LED('D9');
    const e = await start(hex, {
      components: [...doc.components, P],
      wires: [...doc.wires, wire('u.5V', 'p.a'), wire('p.b', 'u.GND_1'), wire('p.wiper', 'u.A0')],
    });
    let text = '';
    e.subscribe((m) => void (m.type === 'serial' && (text += m.text)));
    e.sendInput({ instance: 'p', kind: 'turn', position: 0.25 });
    e.advance(50_000);
    e.getState();
    e.advance(50_000);
    expect(text.trim()).toBe('767');
    const full = 1;
    expect(b(e) / full).toBeGreaterThan(0.1);
    expect(b(e)).toBeLessThan(0.6);
  }, 20000);

  it.each(readdirSync(join(import.meta.dirname, '../../../tests/conformance/sketches')))(
    'agrees with the goldens: %s',
    async (name) => {
      const dir = join(import.meta.dirname, '../../../tests/conformance/sketches', name);
      const hex = await build(readFileSync(join(dir, `${name}.ino`), 'utf8'));
      const e = await start(hex, { components: [uno], wires: [] });
      let text = '';
      e.subscribe((m) => void (m.type === 'serial' && (text += m.text)));
      e.advance(400_000);
      expect(text).toBe(readFileSync(join(dir, 'expected.txt'), 'utf8'));
    },
    30000,
  );
});
