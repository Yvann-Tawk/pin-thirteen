import type { Program } from './codegen';
import { wrap, type CType } from './types';

/** What a sketch can reach. The VM has no other way to touch the outside world. */
export interface ArduinoHost {
  pinMode(pin: number, mode: number): void;
  digitalWrite(pin: number, value: number): void;
  digitalRead(pin: number): number;
  analogRead(pin: number): number;
  analogWrite(pin: number, value: number): void;
  serialWrite(text: string): void;
  serialAvailable(): number;
  serialRead(): number;
  tone(pin: number, frequency: number): void;
  noTone(pin: number): void;
  pulseIn(pin: number, level: number): number;
  servoAttach(servo: number, pin: number): void;
  servoWrite(servo: number, angle: number): void;
}

export interface RuntimeFault {
  line: number;
  message: string;
}

/** One instruction costs this many microseconds. An approximation, not cycle accuracy. */
const MICROS_PER_INSTRUCTION = 1;
const MAX_DEPTH = 64;

/** Same algorithm as Arduino's Print class, so rounding matches real output. */
export function formatFloat(value: number): string {
  if (Number.isNaN(value)) return 'nan';
  if (!Number.isFinite(value)) return 'inf';
  if (value > 4294967040 || value < -4294967040) return 'ovf';
  const sign = value < 0 ? '-' : '';
  const v = Math.fround(Math.abs(value) + 0.005);
  const whole = Math.floor(v);
  let rest = Math.fround(v - whole);
  let digits = '';
  for (let i = 0; i < 2; i++) {
    rest = Math.fround(rest * 10);
    const d = Math.trunc(rest);
    digits += d;
    rest = Math.fround(rest - d);
  }
  return `${sign}${whole}.${digits}`;
}

export class Vm {
  private readonly globals: number[];
  private stack: number[] = [];
  private locals: number[] = [];
  private frames: { pc: number; base: number }[] = [];
  private pc: number;
  private base = 0;
  private wakeAt = 0;
  micros = 0;
  fault: RuntimeFault | null = null;

  constructor(
    private readonly program: Program,
    private readonly host: ArduinoHost,
  ) {
    this.globals = new Array(program.globals).fill(0);
    this.pc = program.entries[program.main]!;
    this.locals = new Array(program.frameSizes[program.main]).fill(0);
  }

  get line(): number {
    return this.program.code[this.pc]?.line ?? 0;
  }

  private stop(message: string) {
    this.fault = { line: this.line, message };
  }

  private bin(op: string, a: number, b: number, t: CType): number {
    const float = t === 'float';
    switch (op) {
      case '+':
        return wrap(a + b, t);
      case '-':
        return wrap(a - b, t);
      case '*':
        return float
          ? Math.fround(a * b)
          : wrap(t === 'long' || t === 'ulong' ? Math.imul(a, b) : a * b, t);
      case '/':
        if (float) return Math.fround(a / b);
        if (b === 0) {
          this.stop('Division by zero. A real board would give a meaningless result here.');
          return 0;
        }
        return wrap(Math.trunc(a / b), t);
      case '%':
        if (b === 0) {
          this.stop('Division by zero. A real board would give a meaningless result here.');
          return 0;
        }
        return wrap(a % b, t);
      case '&':
        return wrap(a & b, t);
      case '|':
        return wrap(a | b, t);
      case '^':
        return wrap(a ^ b, t);
      case '<<':
        return b >= 32 ? 0 : wrap(a << b, t);
      case '>>':
        if (t === 'uint' || t === 'ulong') return b >= 32 ? 0 : wrap(a >>> b, t);
        return a >> Math.min(b, 31);
      case '==':
        return a === b ? 1 : 0;
      case '!=':
        return a !== b ? 1 : 0;
      case '<':
        return a < b ? 1 : 0;
      case '<=':
        return a <= b ? 1 : 0;
      case '>':
        return a > b ? 1 : 0;
      case '>=':
        return a >= b ? 1 : 0;
      default:
        return 0;
    }
  }

  private sys(name: string, instr: { a?: number; t?: CType }) {
    const s = this.stack;
    const h = this.host;
    const pop = () => s.pop() as number;
    switch (name) {
      case 'pinMode': {
        const m = pop();
        h.pinMode(pop(), m);
        break;
      }
      case 'digitalWrite': {
        const v = pop();
        h.digitalWrite(pop(), v);
        break;
      }
      case 'digitalRead':
        s.push(h.digitalRead(pop()));
        break;
      case 'analogRead':
        s.push(h.analogRead(pop()));
        break;
      case 'analogWrite': {
        const v = pop();
        h.analogWrite(pop(), v);
        break;
      }
      case 'delay':
        this.wakeAt = this.micros + pop() * 1000;
        break;
      case 'delayMicroseconds':
        this.wakeAt = this.micros + pop();
        break;
      case 'millis':
        s.push(wrap(Math.floor(this.micros / 1000), 'ulong'));
        break;
      case 'micros':
        s.push(wrap(this.micros, 'ulong'));
        break;
      case 'map': {
        const toHigh = pop(),
          toLow = pop(),
          fromHigh = pop(),
          fromLow = pop(),
          x = pop();
        if (fromHigh === fromLow) return this.stop('map() needs two different input limits.');
        s.push(
          wrap(
            Math.trunc(((x - fromLow) * (toHigh - toLow)) / (fromHigh - fromLow)) + toLow,
            'long',
          ),
        );
        break;
      }
      case 'constrain': {
        const hi = pop(),
          lo = pop(),
          x = pop();
        s.push(x < lo ? lo : x > hi ? hi : x);
        break;
      }
      case 'abs':
        s.push(wrap(Math.abs(pop()), 'long'));
        break;
      case 'min': {
        const b = pop(),
          a = pop();
        s.push(Math.min(a, b));
        break;
      }
      case 'max': {
        const b = pop(),
          a = pop();
        s.push(Math.max(a, b));
        break;
      }
      case 'tone': {
        const f = pop();
        h.tone(pop(), f);
        break;
      }
      case 'noTone':
        h.noTone(pop());
        break;
      case 'pulseIn': {
        const level = pop();
        const width = h.pulseIn(pop(), level);
        this.wakeAt = this.micros + width;
        s.push(width);
        break;
      }
      case 'servo.attach': {
        const p = pop();
        h.servoAttach(pop(), p);
        break;
      }
      case 'servo.write': {
        const a = pop();
        h.servoWrite(pop(), a);
        break;
      }
      case 'Serial.begin':
        pop();
        break;
      case 'Serial.available':
        s.push(h.serialAvailable());
        break;
      case 'Serial.read':
        s.push(h.serialRead());
        break;
      case 'printStr':
        h.serialWrite(this.program.strings[instr.a!]!);
        break;
      case 'print': {
        const v = pop();
        const t = instr.t;
        h.serialWrite(
          t === 'char' ? String.fromCharCode(v & 0xff) : t === 'float' ? formatFloat(v) : String(v),
        );
        break;
      }
    }
  }

  /** Runs until the virtual clock reaches `until`. A busy loop only spends virtual time. */
  run(until: number): void {
    const { code } = this.program;
    const s = this.stack;
    while (this.micros < until && !this.fault) {
      if (this.wakeAt > this.micros) {
        this.micros = Math.min(this.wakeAt, until);
        continue;
      }
      const i = code[this.pc]!;
      this.pc += 1;
      this.micros += MICROS_PER_INSTRUCTION;
      switch (i.op) {
        case 'push':
          s.push(i.a!);
          break;
        case 'pop':
          s.pop();
          break;
        case 'dup':
          s.push(s[s.length - 1]!);
          break;
        case 'loadg':
          s.push(this.globals[i.a!]!);
          break;
        case 'storeg':
          this.globals[i.a!] = s.pop()!;
          break;
        case 'loadl':
          s.push(this.locals[this.base + i.a!]!);
          break;
        case 'storel':
          this.locals[this.base + i.a!] = s.pop()!;
          break;
        case 'loadga':
        case 'loadla':
        case 'storega':
        case 'storela': {
          const index = s.pop()!;
          if (index < 0 || index >= i.b!) {
            this.pc -= 1;
            this.stop(
              `Array index ${index} is outside this array, which has ${i.b} items. A real board would read or corrupt other memory.`,
            );
            break;
          }
          const global = i.op.endsWith('ga');
          const offset = (global ? 0 : this.base) + i.a! + index;
          const store = global ? this.globals : this.locals;
          if (i.op.startsWith('load')) s.push(store[offset]!);
          else store[offset] = s.pop()!;
          break;
        }
        case 'bin': {
          const b = s.pop()!;
          const a = s.pop()!;
          s.push(this.bin(i.s!, a, b, i.t!));
          break;
        }
        case 'neg':
          s.push(wrap(-s.pop()!, i.t!));
          break;
        case 'not':
          s.push(s.pop() ? 0 : 1);
          break;
        case 'inv':
          s.push(wrap(~s.pop()!, i.t!));
          break;
        case 'conv':
          s.push(wrap(s.pop()!, i.t!));
          break;
        case 'jmp':
          this.pc = i.a!;
          break;
        case 'jz':
          if (!s.pop()) this.pc = i.a!;
          break;
        case 'jnz':
          if (s.pop()) this.pc = i.a!;
          break;
        case 'call': {
          if (this.frames.length >= MAX_DEPTH) {
            this.stop('Functions are nested too deeply. A real board would run out of memory.');
            break;
          }
          const base = this.locals.length;
          const size = this.program.frameSizes[i.a!]!;
          for (let n = 0; n < size; n++) this.locals.push(0);
          for (let n = i.b! - 1; n >= 0; n--) this.locals[base + n] = s.pop()!;
          this.frames.push({ pc: this.pc, base: this.base });
          this.base = base;
          this.pc = this.program.entries[i.a!]!;
          break;
        }
        case 'ret': {
          const frame = this.frames.pop()!;
          this.locals.length = this.base;
          this.base = frame.base;
          this.pc = frame.pc;
          break;
        }
        case 'sys':
          this.sys(i.s!, i);
          break;
        case 'yield':
          break;
      }
    }
    if (this.wakeAt <= until && this.micros < until && !this.fault) this.micros = until;
  }
}
