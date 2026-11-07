import { describe, expect, it } from 'vitest';
import { compile } from './index';
import { runSketch } from './testing';

const body = (code: string) => `void setup() { Serial.begin(9600); ${code} }\nvoid loop() { }`;
const out = (code: string) => runSketch(body(code), 2_000_000).serial;

describe('AVR semantics', () => {
  it('wraps int at 16 bits', () =>
    expect(out('int x = 32767; x++; Serial.print(x);')).toBe('-32768'));
  it('wraps byte at 8 bits', () =>
    expect(out('byte b = 250; b += 10; Serial.print(b);')).toBe('4'));
  it('int multiply overflows like the UNO', () =>
    expect(out('int a = 300; Serial.print(a * a);')).toBe('24464'));
  it('integer division truncates', () => expect(out('Serial.print(-7 / 2);')).toBe('-3'));
  it('promotes int to unsigned long', () =>
    expect(out('unsigned long u = 1; Serial.print(u - 2);')).toBe('4294967295'));
  it('prints floats with two decimals', () =>
    expect(out('float f = 2.5; Serial.print(f * 1.5);')).toBe('3.75'));
  it('truncates float to int', () => expect(out('int i = 3.9; Serial.print(i);')).toBe('3'));
});

describe('language', () => {
  it('runs functions declared after use, with recursion', () => {
    const src = `void setup(){ Serial.print(fact(5)); } void loop(){} long fact(long n){ if(n<=1) return 1; return n*fact(n-1); }`;
    expect(runSketch(src, 100000).serial).toBe('120');
  });
  it('runs arrays, for, continue and break', () => {
    expect(
      out(
        'int a[] = {1,2,3,4}; int s = 0; for (int i = 0; i < 4; i++) { if (i == 1) continue; if (i == 3) break; s += a[i]; } Serial.print(s);',
      ),
    ).toBe('4');
  });
  it('runs switch with fallthrough', () => {
    expect(
      out(
        'int x = 1; switch (x) { case 1: Serial.print("a"); case 2: Serial.print("b"); break; default: Serial.print("c"); }',
      ),
    ).toBe('ab');
  });
  it('short-circuits logic and handles ternary', () => {
    expect(out('int x = 0; bool b = (x != 0) && (10 / x > 1); Serial.print(b ? 5 : 6);')).toBe('6');
  });
  it('evaluates array compound assignment index once', () => {
    expect(out('int a[2]; int i = 0; a[i++] += 5; Serial.print(i); Serial.print(a[0]);')).toBe(
      '15',
    );
  });
  it('supports do while inside a for', () => {
    expect(
      out(
        'int c = 0; for (int i = 0; i < 2; i++) { int j = 0; do { j++; c++; } while (j < 2); } Serial.print(c);',
      ),
    ).toBe('4');
  });
});

describe('diagnostics', () => {
  it.each([
    ['#include <Wire.h>\nvoid setup(){}\nvoid loop(){}', 1, 'unsupported'],
    ['void setup(){\n  int *p;\n}\nvoid loop(){}', 2, 'unsupported'],
    ['void setup(){\n\n  String s;\n}\nvoid loop(){}', 3, 'unsupported'],
    ['void setup(){\n  random(8);\n}\nvoid loop(){}', 2, 'unsupported'],
    ['void setup(){\n  int x = 1\n}\nvoid loop(){}', 2, 'syntax'],
    ['void setup(){\n  y = 1;\n}\nvoid loop(){}', 2, 'type'],
    ['const int x = 1;\nvoid setup(){\n  x = 2;\n}\nvoid loop(){}', 3, 'type'],
  ])('%#', (src, line, kind) => {
    const r = compile(src);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.diagnostics[0]).toMatchObject({ line, kind });
  });
  it('asks for setup and loop', () => {
    expect(compile('int x;').ok).toBe(false);
  });
});

describe('execution safety', () => {
  it('survives an endless loop by spending virtual time', () => {
    const { vm } = runSketch('void setup(){ while (1) { } } void loop(){}', 500_000);
    expect(vm.micros).toBe(500_000);
    expect(vm.fault).toBeNull();
  });
  it('reports out-of-range arrays, division by zero, and runaway recursion with a line', () => {
    expect(
      runSketch('void setup(){\n int a[2]; int i = 5;\n a[i] = 1;\n}\nvoid loop(){}', 1000).vm.fault
        ?.line,
    ).toBe(3);
    expect(
      runSketch('void setup(){ int z = 0; Serial.print(1 / z); } void loop(){}', 1000).vm.fault
        ?.message,
    ).toContain('zero');
    expect(
      runSketch('void f(){ f(); } void setup(){ f(); } void loop(){}', 100000).vm.fault?.message,
    ).toContain('deeply');
  });
});

it('Blink toggles pin 13 once per delay, and the delay value sets the rate', () => {
  const blink = (ms: number) =>
    `void setup(){ pinMode(13, OUTPUT); } void loop(){ digitalWrite(13, HIGH); delay(${ms}); digitalWrite(13, LOW); delay(${ms}); }`;
  expect(
    runSketch(blink(1000), 4_100_000)
      .trace.map((t) => t[2])
      .slice(0, 5),
  ).toEqual([1, 0, 1, 0, 1]);
  expect(runSketch(blink(250), 4_100_000).trace.length).toBeGreaterThan(15);
  const { trace } = runSketch(blink(1000), 3_100_000);
  expect(trace[1]![0] - trace[0]![0]).toBeGreaterThanOrEqual(1_000_000);
  expect(trace[1]![0] - trace[0]![0]).toBeLessThan(1_000_100);
});
