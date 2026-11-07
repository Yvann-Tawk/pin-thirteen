import type { Expr, FuncDecl, Stmt, Unit, VarDecl } from './parser';
import { CompileError, type CType } from './types';

export type Op =
  | 'push'
  | 'pop'
  | 'dup'
  | 'loadg'
  | 'storeg'
  | 'loadl'
  | 'storel'
  | 'loadga'
  | 'storega'
  | 'loadla'
  | 'storela'
  | 'bin'
  | 'neg'
  | 'not'
  | 'inv'
  | 'conv'
  | 'jmp'
  | 'jz'
  | 'jnz'
  | 'call'
  | 'ret'
  | 'sys'
  | 'yield';

export interface Instr {
  op: Op;
  a?: number;
  b?: number;
  s?: string;
  t?: CType;
  line: number;
}

export interface Program {
  code: Instr[];
  globals: number;
  frameSizes: number[];
  entries: number[];
  strings: string[];
  /** Index of the startup function, which runs initialisers, setup, then loop forever. */
  main: number;
}

type Sig = { args: CType[]; ret: CType; optional?: number };

const BUILTINS: Record<string, Sig> = {
  pinMode: { args: ['byte', 'byte'], ret: 'void' },
  digitalWrite: { args: ['byte', 'byte'], ret: 'void' },
  digitalRead: { args: ['byte'], ret: 'int' },
  analogRead: { args: ['byte'], ret: 'int' },
  analogWrite: { args: ['byte', 'int'], ret: 'void' },
  delay: { args: ['ulong'], ret: 'void' },
  delayMicroseconds: { args: ['uint'], ret: 'void' },
  millis: { args: [], ret: 'ulong' },
  micros: { args: [], ret: 'ulong' },
  map: { args: ['long', 'long', 'long', 'long', 'long'], ret: 'long' },
  constrain: { args: ['long', 'long', 'long'], ret: 'long' },
  abs: { args: ['long'], ret: 'long' },
  min: { args: ['long', 'long'], ret: 'long' },
  max: { args: ['long', 'long'], ret: 'long' },
  tone: { args: ['byte', 'uint'], ret: 'void' },
  noTone: { args: ['byte'], ret: 'void' },
  pulseIn: { args: ['byte', 'byte'], ret: 'ulong' },
  'Serial.begin': { args: ['long'], ret: 'void' },
  'Serial.available': { args: [], ret: 'int' },
  'Serial.read': { args: [], ret: 'int' },
};

const CONSTANTS: Record<string, [number, CType]> = {
  HIGH: [1, 'int'],
  LOW: [0, 'int'],
  INPUT: [0, 'int'],
  OUTPUT: [1, 'int'],
  INPUT_PULLUP: [2, 'int'],
  LED_BUILTIN: [13, 'int'],
  true: [1, 'bool'],
  false: [0, 'bool'],
  A0: [14, 'int'],
  A1: [15, 'int'],
  A2: [16, 'int'],
  A3: [17, 'int'],
  A4: [18, 'int'],
  A5: [19, 'int'],
};

const LATER: Record<string, string> = {
  attachInterrupt: 'Interrupts need the AVR engine, planned for a later phase.',
  random: 'random() is not supported yet.',
};

const RANK: CType[] = ['int', 'uint', 'long', 'ulong', 'float'];
const promote = (t: CType): CType => (RANK.includes(t) ? t : 'int');
const common = (a: CType, b: CType): CType =>
  RANK[Math.max(RANK.indexOf(promote(a)), RANK.indexOf(promote(b)))]!;

interface Sym {
  scope: 'g' | 'l';
  slot: number;
  type: CType;
  length?: number;
  isConst: boolean;
}

interface LoopCtx {
  breaks: number[];
  continues: number[];
}

export function generate(unit: Unit): Program {
  const code: Instr[] = [];
  const strings: string[] = [];
  const globals = new Map<string, Sym>();
  const funcs = new Map<string, { index: number; decl: FuncDecl }>();
  let globalSize = 0;
  const entries: number[] = [];
  const frameSizes: number[] = [];

  let scopes: Map<string, Sym>[] = [];
  let frame = 0;
  let current: FuncDecl | undefined;
  let line = 1;
  const loops: LoopCtx[] = [];

  const fail = (
    at: { line: number; column: number },
    message: string,
    kind: 'type' | 'unsupported' = 'type',
  ): never => {
    throw new CompileError({ line: at.line, column: at.column, message, kind });
  };
  const emit = (op: Op, rest: Partial<Instr> = {}) => code.push({ op, line, ...rest }) - 1;
  const here = () => code.length;
  const patch = (at: number) => {
    code[at]!.a = here();
  };
  const conv = (from: CType, to: CType) => {
    if (from !== to) emit('conv', { t: to });
  };
  const lookup = (name: string): Sym | undefined => {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const s = scopes[i]!.get(name);
      if (s) return s;
    }
    return globals.get(name);
  };
  const local = (size = 1) => {
    const slot = frame;
    frame += size;
    return slot;
  };

  const symbol = (e: { line: number; column: number }, name: string): Sym => {
    const s = lookup(name);
    if (!s) fail(e, `${name} is not declared. Check the spelling, or declare it first.`);
    return s!;
  };

  function loadVar(s: Sym) {
    emit(s.scope === 'g' ? 'loadg' : 'loadl', { a: s.slot });
  }
  function storeVar(s: Sym) {
    emit(s.scope === 'g' ? 'storeg' : 'storel', { a: s.slot });
  }

  /** Emits code leaving the value on the stack, and returns its type. */
  function value(e: Expr): CType {
    line = e.line;
    switch (e.k) {
      case 'num':
        emit('push', { a: e.value });
        return e.type;
      case 'str':
        return fail(e, 'Text can only be used inside Serial.print here.', 'unsupported');
      case 'var': {
        const c = CONSTANTS[e.name];
        if (c && !lookup(e.name)) {
          emit('push', { a: c[0] });
          return c[1];
        }
        const s = symbol(e, e.name);
        if (s.length !== undefined) fail(e, 'Use an index with this array, such as values[0].');
        loadVar(s);
        return s.type;
      }
      case 'index': {
        const s = symbol(e, e.name);
        if (s.length === undefined) fail(e, `${e.name} is not an array.`);
        conv(value(e.index), 'long');
        emit(s.scope === 'g' ? 'loadga' : 'loadla', { a: s.slot, b: s.length! });
        return s.type;
      }
      case 'unary': {
        const t = value(e.arg);
        if (e.op === '!') {
          emit('not');
          return 'bool';
        }
        const p = promote(t);
        conv(t, p);
        if (e.op === '-') emit('neg', { t: p });
        if (e.op === '~') {
          if (p === 'float') fail(e, '~ only works on whole numbers.');
          emit('inv', { t: p });
        }
        return p;
      }
      case 'binary':
        return binary(e);
      case 'logic': {
        value(e.left);
        emit('conv', { t: 'bool' });
        emit('dup');
        const jump = emit(e.op === '&&' ? 'jz' : 'jnz');
        emit('pop');
        value(e.right);
        emit('conv', { t: 'bool' });
        patch(jump);
        return 'bool';
      }
      case 'ternary': {
        // Both arms need the common type, so a dry run finds it before emitting.
        const mark = here();
        const yes = value(e.yes);
        const no = value(e.no);
        code.length = mark;
        const t = yes === no ? yes : common(yes, no);
        value(e.test);
        const toNo = emit('jz');
        conv(value(e.yes), t);
        const toEnd = emit('jmp');
        patch(toNo);
        conv(value(e.no), t);
        patch(toEnd);
        return t;
      }
      case 'assign':
        return assign(e);
      case 'incdec':
        return incdec(e);
      case 'cast': {
        conv(value(e.arg), e.type);
        return e.type;
      }
      case 'call':
        return call(e);
    }
  }

  function binary(e: Expr & { k: 'binary' }): CType {
    const mark = here();
    const lt = value(e.left);
    const after = here();
    const rt = value(e.right);
    const rightCode = code.splice(after);
    const leftCode = code.splice(mark);
    const shift = e.op === '<<' || e.op === '>>';
    const t = shift ? promote(lt) : common(lt, rt);
    if (t === 'float' && ['%', '&', '|', '^', '<<', '>>'].includes(e.op)) {
      fail(e, `${e.op} only works on whole numbers.`);
    }
    code.push(...leftCode);
    conv(lt, t);
    code.push(...rebase(rightCode, after, here()));
    conv(rt, shift ? 'int' : t);
    line = e.line;
    emit('bin', { s: e.op, t });
    return ['==', '!=', '<', '<=', '>', '>='].includes(e.op) ? 'bool' : t;
  }

  /** Jump targets are absolute, so moved code must be shifted. */
  function rebase(moved: Instr[], from: number, to: number): Instr[] {
    const delta = to - from;
    return moved.map((i) =>
      i.op === 'jmp' || i.op === 'jz' || i.op === 'jnz' ? { ...i, a: i.a! + delta } : i,
    );
  }

  function target(t: Expr): { sym: Sym; idxTemp?: number } {
    if (t.k === 'var') {
      const s = symbol(t, t.name);
      if (s.length !== undefined) fail(t, 'Use an index with this array, such as values[0].');
      if (s.isConst) fail(t, `${t.name} is const, so it cannot change.`);
      return { sym: s };
    }
    if (t.k !== 'index') return fail(t, 'Only a variable can be assigned to.');
    const s = symbol(t, t.name);
    if (s.length === undefined) fail(t, `${t.name} is not an array.`);
    if (s.isConst) fail(t, `${t.name} is const, so it cannot change.`);
    const temp = local();
    conv(value(t.index), 'long');
    emit('storel', { a: temp });
    return { sym: s, idxTemp: temp };
  }

  function load(tg: { sym: Sym; idxTemp?: number }) {
    if (tg.idxTemp === undefined) return loadVar(tg.sym);
    emit('loadl', { a: tg.idxTemp });
    emit(tg.sym.scope === 'g' ? 'loadga' : 'loadla', { a: tg.sym.slot, b: tg.sym.length! });
  }

  function store(tg: { sym: Sym; idxTemp?: number }) {
    if (tg.idxTemp === undefined) return storeVar(tg.sym);
    emit('loadl', { a: tg.idxTemp });
    emit(tg.sym.scope === 'g' ? 'storega' : 'storela', { a: tg.sym.slot, b: tg.sym.length! });
  }

  function assign(e: Expr & { k: 'assign' }): CType {
    const tg = target(e.target);
    const t = tg.sym.type;
    if (e.op === '=') {
      conv(value(e.value), t);
    } else {
      const op = e.op.slice(0, -1);
      load(tg);
      const mark = here();
      const rt = value(e.value);
      const rhs = code.splice(mark);
      const shift = op === '<<' || op === '>>';
      const ct = shift ? promote(t) : common(t, rt);
      conv(t, ct);
      const start = here();
      code.push(...rebase(rhs, mark, start));
      conv(rt, shift ? 'int' : ct);
      line = e.line;
      emit('bin', { s: op, t: ct });
      conv(ct, t);
    }
    emit('dup');
    store(tg);
    return t;
  }

  function incdec(e: Expr & { k: 'incdec' }): CType {
    const tg = target(e.target);
    const t = tg.sym.type;
    load(tg);
    if (!e.prefix) emit('dup');
    const ct = common(t, 'int');
    conv(t, ct);
    emit('push', { a: 1 });
    emit('bin', { s: e.op === '++' ? '+' : '-', t: ct });
    conv(ct, t);
    if (e.prefix) emit('dup');
    store(tg);
    return t;
  }

  function call(e: Expr & { k: 'call' }): CType {
    if (e.name === 'Serial.print' || e.name === 'Serial.println') {
      const nl = e.name === 'Serial.println';
      if (e.args.length > 1)
        fail(e, `${e.name} with a format is not supported yet.`, 'unsupported');
      const arg = e.args[0];
      if (arg) {
        if (arg.k === 'str') {
          emit('sys', { s: 'printStr', a: strings.push(arg.value) - 1 });
        } else {
          const t = value(arg);
          emit('sys', { s: 'print', t });
        }
      }
      if (nl) emit('sys', { s: 'printStr', a: strings.push('\r\n') - 1 });
      return 'void';
    }
    const dot = e.name.indexOf('.');
    const servo = dot > 0 ? unit.servos.indexOf(e.name.slice(0, dot)) : -1;
    if (servo >= 0) {
      const method = e.name.slice(dot + 1);
      if ((method !== 'attach' && method !== 'write') || e.args.length !== 1) {
        fail(e, `Servo supports attach(pin) and write(angle) here.`, 'unsupported');
      }
      emit('push', { a: servo });
      conv(value(e.args[0]!), 'int');
      line = e.line;
      emit('sys', { s: `servo.${method}` });
      return 'void';
    }
    const user = funcs.get(e.name);
    if (user) {
      const { params, type } = user.decl;
      if (e.args.length !== params.length) {
        fail(e, `${e.name} takes ${params.length} value(s), but got ${e.args.length}.`);
      }
      e.args.forEach((a, i) => conv(value(a), params[i]!.type));
      line = e.line;
      emit('call', { a: user.index, b: params.length });
      return type;
    }
    const b = BUILTINS[e.name];
    if (!b) {
      const later = LATER[e.name];
      return fail(
        e,
        later ?? `${e.name}() is not supported by the educational simulator.`,
        'unsupported',
      );
    }
    if (e.args.length !== b.args.length) {
      fail(e, `${e.name} takes ${b.args.length} value(s), but got ${e.args.length}.`);
    }
    e.args.forEach((a, i) => conv(value(a), b.args[i]!));
    line = e.line;
    emit('sys', { s: e.name });
    return b.ret;
  }

  function scoped(fn: () => void) {
    scopes.push(new Map());
    fn();
    scopes.pop();
  }

  function declareLocal(v: VarDecl) {
    if (scopes.at(-1)!.has(v.name)) fail(v, `${v.name} is already declared here.`);
    const slot = local(v.length ?? 1);
    const sym: Sym = { scope: 'l', slot, type: v.type, isConst: v.isConst };
    if (v.length !== undefined) sym.length = v.length;
    scopes.at(-1)!.set(v.name, sym);
    line = v.line;
    if (v.items) {
      for (let i = 0; i < v.length!; i++) {
        const item = v.items[i];
        if (item) conv(value(item), v.type);
        else emit('push', { a: 0 });
        emit('storel', { a: slot + i });
      }
    } else if (v.init) {
      conv(value(v.init), v.type);
      emit('storel', { a: slot });
    } else {
      // Unlike real locals, these start at zero. Sketches should not rely on either.
      for (let i = 0; i < (v.length ?? 1); i++) {
        emit('push', { a: 0 });
        emit('storel', { a: slot + i });
      }
    }
  }

  function discard(e: Expr) {
    const t = value(e);
    if (t !== 'void') emit('pop');
  }

  function statement(s: Stmt): void {
    line = s.line;
    switch (s.k) {
      case 'block':
        scoped(() => s.body.forEach(statement));
        return;
      case 'decl':
        s.vars.forEach(declareLocal);
        return;
      case 'expr':
        discard(s.expr);
        return;
      case 'if': {
        value(s.test);
        const toElse = emit('jz');
        statement(s.yes);
        if (s.no) {
          const toEnd = emit('jmp');
          patch(toElse);
          statement(s.no);
          patch(toEnd);
        } else {
          patch(toElse);
        }
        return;
      }
      case 'while': {
        const top = here();
        value(s.test);
        const exit = emit('jz');
        loop(s.body, top);
        emit('jmp', { a: top });
        patch(exit);
        closeLoop();
        return;
      }
      case 'do': {
        const top = here();
        const ctx = openLoop();
        statement(s.body);
        ctx.continues.forEach(patch);
        ctx.continues = [];
        value(s.test);
        emit('jnz', { a: top });
        closeLoop();
        return;
      }
      case 'for':
        scoped(() => {
          if (s.init) statement(s.init);
          const top = here();
          let exit = -1;
          if (s.test) {
            value(s.test);
            exit = emit('jz');
          }
          const ctx = openLoop();
          statement(s.body);
          ctx.continues.forEach(patch);
          ctx.continues = [];
          if (s.step) discard(s.step);
          emit('jmp', { a: top });
          if (exit >= 0) patch(exit);
          closeLoop();
        });
        return;
      case 'switch': {
        const temp = local();
        conv(value(s.test), 'long');
        emit('storel', { a: temp });
        const jumps: number[] = [];
        for (const c of s.cases) {
          if (!c.value) continue;
          emit('loadl', { a: temp });
          conv(value(c.value), 'long');
          emit('bin', { s: '==', t: 'long' });
          jumps.push(emit('jnz'));
        }
        const toDefault = emit('jmp');
        const ctx = openLoop();
        ctx.continues = [];
        let next = 0;
        let hasDefault = false;
        for (const c of s.cases) {
          if (c.value) patch(jumps[next++]!);
          else {
            patch(toDefault);
            hasDefault = true;
          }
          c.body.forEach(statement);
        }
        if (!hasDefault) patch(toDefault);
        const outer = loops.at(-2);
        if (outer) outer.continues.push(...ctx.continues);
        closeLoop();
        return;
      }
      case 'break': {
        const ctx = loops.at(-1);
        if (!ctx) fail(s, 'break must be inside a loop or switch.');
        ctx!.breaks.push(emit('jmp'));
        return;
      }
      case 'continue': {
        const ctx = loops.at(-1);
        if (!ctx) fail(s, 'continue must be inside a loop.');
        ctx!.continues.push(emit('jmp'));
        return;
      }
      case 'return': {
        if (s.value) {
          if (current?.type === 'void')
            fail(s, `${current.name} is void, so it cannot return a value.`);
          conv(value(s.value), current!.type);
        } else if (current?.type !== 'void') {
          fail(s, 'This function must return a value.');
        }
        emit('ret', { a: s.value ? 1 : 0 });
        return;
      }
    }
  }

  function openLoop(): LoopCtx {
    const ctx = { breaks: [], continues: [] };
    loops.push(ctx);
    return ctx;
  }
  function loop(body: Stmt, top: number) {
    const ctx = openLoop();
    statement(body);
    ctx.continues.forEach((at) => (code[at]!.a = top));
    ctx.continues = [];
  }
  function closeLoop() {
    loops.pop()!.breaks.forEach(patch);
  }

  // Globals are zeroed, as on a real board, and laid out before any code uses them.
  for (const v of unit.globals) {
    if (globals.has(v.name)) fail(v, `${v.name} is already declared.`);
    const sym: Sym = { scope: 'g', slot: globalSize, type: v.type, isConst: v.isConst };
    if (v.length !== undefined) sym.length = v.length;
    globals.set(v.name, sym);
    globalSize += v.length ?? 1;
  }
  unit.functions.forEach((decl, index) => {
    if (funcs.has(decl.name)) fail(decl, `${decl.name} is already defined.`);
    funcs.set(decl.name, { index, decl });
  });
  const setup = funcs.get('setup');
  const main = funcs.get('loop');
  if (!setup) fail({ line: 1, column: 1 }, 'Every sketch needs a setup() function.');
  if (!main) fail({ line: 1, column: 1 }, 'Every sketch needs a loop() function.');

  unit.functions.forEach((decl, index) => {
    entries[index] = here();
    current = decl;
    frame = decl.params.length;
    scopes = [
      new Map(
        decl.params.map((p, i) => [
          p.name,
          { scope: 'l' as const, slot: i, type: p.type, isConst: false },
        ]),
      ),
    ];
    line = decl.line;
    decl.body.body.forEach(statement);
    emit('ret', { a: 0 });
    frameSizes[index] = frame;
  });

  // Startup function: initialisers, setup(), then loop() forever.
  const startup = unit.functions.length;
  entries[startup] = here();
  current = undefined;
  frame = 0;
  scopes = [new Map()];
  for (const v of unit.globals) {
    const sym = globals.get(v.name)!;
    line = v.line;
    if (v.items) {
      v.items.forEach((item, i) => {
        conv(value(item), v.type);
        emit('storeg', { a: sym.slot + i });
      });
    } else if (v.init) {
      conv(value(v.init), v.type);
      emit('storeg', { a: sym.slot });
    }
  }
  line = setup!.decl.line;
  emit('call', { a: setup!.index, b: 0 });
  const top = here();
  emit('call', { a: main!.index, b: 0 });
  emit('yield');
  emit('jmp', { a: top });
  frameSizes[startup] = frame;

  return { code, globals: globalSize, frameSizes, entries, strings, main: startup };
}
