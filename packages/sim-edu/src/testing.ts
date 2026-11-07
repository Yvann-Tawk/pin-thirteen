import { compile } from './index';
import { Vm, type ArduinoHost } from './vm';

export function runSketch(source: string, micros: number) {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics[0]?.message);
  let serial = '';
  const trace: [number, number, number][] = [];
  const reads: Record<number, number> = {};
  const host: ArduinoHost = {
    pinMode() {},
    digitalWrite: (pin, v) => void trace.push([vm.micros, pin, v]),
    digitalRead: (pin) => reads[pin] ?? 0,
    analogRead: (pin) => reads[pin] ?? 0,
    analogWrite: (pin, v) => void trace.push([vm.micros, pin, v]),
    serialWrite: (t) => void (serial += t),
    serialAvailable: () => 0,
    serialRead: () => -1,
  };
  const vm: Vm = new Vm(result.program, host);
  vm.run(micros);
  return { serial, trace, vm };
}
