import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runSketch } from './testing';

// Expected output comes from real avr-gcc on avr8js. See tests/conformance/tools.
const root = join(import.meta.dirname, '../../../tests/conformance/sketches');

describe.each(readdirSync(root).map((name) => [name]))('matches avr-gcc: %s', (name: string) => {
  it('prints identical serial output', () => {
    const source = readFileSync(join(root, name, `${name}.ino`), 'utf8');
    const expected = readFileSync(join(root, name, 'expected.txt'), 'utf8');
    const { serial, vm } = runSketch(source, 1_000_000);
    expect(vm.fault).toBeNull();
    expect(serial).toBe(expected);
  });
});
