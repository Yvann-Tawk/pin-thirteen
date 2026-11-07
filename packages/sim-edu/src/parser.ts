import type { Token } from './lexer';
import { CompileError, type CType } from './types';

export interface Pos {
  line: number;
  column: number;
}

export type Expr = Pos &
  (
    | { k: 'num'; value: number; type: CType }
    | { k: 'str'; value: string }
    | { k: 'var'; name: string }
    | { k: 'index'; name: string; index: Expr }
    | { k: 'unary'; op: string; arg: Expr }
    | { k: 'binary'; op: string; left: Expr; right: Expr }
    | { k: 'logic'; op: '&&' | '||'; left: Expr; right: Expr }
    | { k: 'ternary'; test: Expr; yes: Expr; no: Expr }
    | { k: 'assign'; op: string; target: Expr; value: Expr }
    | { k: 'incdec'; op: '++' | '--'; prefix: boolean; target: Expr }
    | { k: 'call'; name: string; args: Expr[] }
    | { k: 'cast'; type: CType; arg: Expr }
  );

export interface VarDecl extends Pos {
  name: string;
  type: CType;
  isConst: boolean;
  length?: number;
  init?: Expr;
  items?: Expr[];
}

export type Stmt = Pos &
  (
    | { k: 'block'; body: Stmt[] }
    | { k: 'decl'; vars: VarDecl[] }
    | { k: 'expr'; expr: Expr }
    | { k: 'if'; test: Expr; yes: Stmt; no?: Stmt }
    | { k: 'while'; test: Expr; body: Stmt }
    | { k: 'do'; test: Expr; body: Stmt }
    | { k: 'for'; init?: Stmt; test?: Expr; step?: Expr; body: Stmt }
    | { k: 'switch'; test: Expr; cases: { value?: Expr; body: Stmt[] }[] }
    | { k: 'break' }
    | { k: 'continue' }
    | { k: 'return'; value?: Expr }
  );

export interface FuncDecl extends Pos {
  name: string;
  type: CType;
  params: { name: string; type: CType }[];
  body: Stmt & { k: 'block' };
}

export interface Unit {
  servos: string[];
  globals: VarDecl[];
  functions: FuncDecl[];
}

const TYPE_WORDS = new Set([
  'void',
  'bool',
  'boolean',
  'char',
  'byte',
  'int',
  'long',
  'unsigned',
  'signed',
  'float',
  'double',
  'word',
  'uint8_t',
  'int8_t',
  'int16_t',
  'uint16_t',
  'int32_t',
  'uint32_t',
]);

const NAMED_TYPES: Record<string, CType> = {
  void: 'void',
  bool: 'bool',
  boolean: 'bool',
  char: 'char',
  byte: 'byte',
  float: 'float',
  double: 'float',
  word: 'uint',
  uint8_t: 'byte',
  int8_t: 'char',
  int16_t: 'int',
  uint16_t: 'uint',
  int32_t: 'long',
  uint32_t: 'ulong',
};

const REJECTED: Record<string, string> = {
  class: 'Classes need the AVR engine, planned for a later phase.',
  struct: 'Structs need the AVR engine, planned for a later phase.',
  template: 'Templates need the AVR engine, planned for a later phase.',
  enum: 'Enums are not supported yet. Use const int values instead.',
  typedef: 'typedef is not supported here.',
  goto: 'goto is not supported here. Use a loop instead.',
  asm: 'Inline assembly needs the AVR engine, planned for a later phase.',
  String: 'String objects are not supported yet. Serial.print("text") works.',
  sizeof: 'sizeof is not supported here.',
  new: 'Dynamic memory is not supported here.',
  delete: 'Dynamic memory is not supported here.',
  volatile: 'volatile is used with interrupts, which are not supported here.',
  static: 'static variables are not supported yet. Use a global variable instead.',
};

const ASSIGN = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']);
const LEVELS = [
  ['|'],
  ['^'],
  ['&'],
  ['==', '!='],
  ['<', '<=', '>', '>='],
  ['<<', '>>'],
  ['+', '-'],
  ['*', '/', '%'],
];

export function parse(tokens: Token[]): Unit {
  let p = 0;
  const peek = (n = 0): Token => tokens[Math.min(p + n, tokens.length - 1)]!;
  const pos = (t = peek()): Pos => ({ line: t.line, column: t.column });
  const fail = (message: string, t = peek(), kind: 'syntax' | 'unsupported' = 'syntax'): never => {
    throw new CompileError({ line: t.line, column: t.column, message, kind });
  };
  const is = (text: string, n = 0) => {
    const t = peek(n);
    return (t.kind === 'op' || t.kind === 'id') && t.text === text;
  };
  const accept = (text: string) => {
    if (!is(text)) return false;
    p += 1;
    return true;
  };
  const expect = (text: string) => {
    if (!accept(text)) {
      const before = tokens[Math.max(0, p - 1)]!;
      fail(
        text === ';' ? 'Add a semicolon at the end of this line.' : `Expected ${text} here.`,
        text === ';' ? before : peek(),
      );
    }
  };
  const checkWord = (t: Token) => {
    const message = t.kind === 'id' ? REJECTED[t.text] : undefined;
    if (message) fail(message, t, 'unsupported');
  };
  const name = (): string => {
    const t = peek();
    checkWord(t);
    if (t.kind !== 'id') fail('Expected a name here.');
    p += 1;
    return t.text;
  };

  const startsType = (n = 0) => {
    const t = peek(n);
    return t.kind === 'id' && (TYPE_WORDS.has(t.text) || t.text === 'const');
  };

  function type(): CType {
    const words: string[] = [];
    while (peek().kind === 'id' && TYPE_WORDS.has(peek().text)) {
      words.push(peek().text);
      p += 1;
    }
    if (is('*') || is('&')) {
      fail(
        is('*')
          ? 'Pointers need the AVR engine, planned for a later phase.'
          : 'References need the AVR engine, planned for a later phase.',
        peek(),
        'unsupported',
      );
    }
    const unsigned = words.includes('unsigned');
    const rest = words.filter((w) => w !== 'unsigned' && w !== 'signed');
    if (rest.filter((w) => w === 'long').length > 1)
      fail('long long is not supported here.', peek(), 'unsupported');
    if (rest.includes('long')) return unsigned ? 'ulong' : 'long';
    if (rest.length === 0 || rest[0] === 'int') return unsigned ? 'uint' : 'int';
    if (rest[0] === 'char') return unsigned ? 'byte' : 'char';
    return NAMED_TYPES[rest[0]!] ?? 'int';
  }

  function primary(): Expr {
    const t = peek();
    const at = pos(t);
    if (t.kind === 'number') {
      p += 1;
      const v = t.value!;
      const u = t.suffix!.includes('u');
      const l = t.suffix!.includes('l');
      let lt: CType;
      if (!l && !u && v <= 32767) lt = 'int';
      else if (!l && v <= 65535 && (u || t.text.startsWith('0'))) lt = 'uint';
      else if (!u && v <= 2147483647) lt = 'long';
      else lt = 'ulong';
      return { ...at, k: 'num', value: v, type: lt };
    }
    if (t.kind === 'float') {
      p += 1;
      return { ...at, k: 'num', value: t.value!, type: 'float' };
    }
    if (t.kind === 'char') {
      p += 1;
      return { ...at, k: 'num', value: t.value!, type: 'char' };
    }
    if (t.kind === 'string') {
      p += 1;
      return { ...at, k: 'str', value: t.text };
    }
    if (accept('(')) {
      const inner = expr();
      expect(')');
      return inner;
    }
    if (startsType()) {
      const ty = type();
      expect('(');
      const arg = expr();
      expect(')');
      return { ...at, k: 'cast', type: ty, arg };
    }
    if (t.kind !== 'id') fail(`Expected a value here, not ${t.text}.`);
    let id = name();
    if (accept('.')) id = `${id}.${name()}`;
    if (accept('(')) {
      const args: Expr[] = [];
      if (!is(')')) {
        do args.push(expr());
        while (accept(','));
      }
      expect(')');
      return { ...at, k: 'call', name: id, args };
    }
    if (accept('[')) {
      const index = expr();
      expect(']');
      return { ...at, k: 'index', name: id, index };
    }
    return { ...at, k: 'var', name: id };
  }

  function postfix(): Expr {
    let e = primary();
    while (is('++') || is('--')) {
      const op = peek().text as '++' | '--';
      p += 1;
      e = { line: e.line, column: e.column, k: 'incdec', op, prefix: false, target: e };
    }
    return e;
  }

  function unary(): Expr {
    const t = peek();
    const at = pos(t);
    if (t.kind === 'op') {
      if (t.text === '*' || t.text === '&') {
        fail('Pointers need the AVR engine, planned for a later phase.', t, 'unsupported');
      }
      if (['-', '+', '!', '~'].includes(t.text)) {
        p += 1;
        return { ...at, k: 'unary', op: t.text, arg: unary() };
      }
      if (t.text === '++' || t.text === '--') {
        p += 1;
        return { ...at, k: 'incdec', op: t.text, prefix: true, target: unary() };
      }
      if (t.text === '(' && startsType(1)) {
        p += 1;
        const ty = type();
        expect(')');
        return { ...at, k: 'cast', type: ty, arg: unary() };
      }
    }
    return postfix();
  }

  function binary(level: number): Expr {
    const ops = LEVELS[level];
    if (!ops) return unary();
    let left = binary(level + 1);
    while (peek().kind === 'op' && ops.includes(peek().text)) {
      const op = peek().text;
      p += 1;
      left = {
        line: left.line,
        column: left.column,
        k: 'binary',
        op,
        left,
        right: binary(level + 1),
      };
    }
    return left;
  }

  function logic(op: '&&' | '||'): Expr {
    let left = op === '||' ? logic('&&') : binary(0);
    while (is(op)) {
      p += 1;
      const right = op === '||' ? logic('&&') : binary(0);
      left = { line: left.line, column: left.column, k: 'logic', op, left, right };
    }
    return left;
  }

  function expr(): Expr {
    const left = logic('||');
    if (accept('?')) {
      const yes = expr();
      expect(':');
      return { line: left.line, column: left.column, k: 'ternary', test: left, yes, no: expr() };
    }
    if (peek().kind === 'op' && ASSIGN.has(peek().text)) {
      if (left.k !== 'var' && left.k !== 'index') fail('Only a variable can be assigned to.');
      const op = peek().text;
      p += 1;
      return { line: left.line, column: left.column, k: 'assign', op, target: left, value: expr() };
    }
    return left;
  }

  function declarators(ty: CType, isConst: boolean): VarDecl[] {
    const vars: VarDecl[] = [];
    do {
      if (is('*') || is('&')) type();
      const at = pos();
      const v: VarDecl = { ...at, name: name(), type: ty, isConst };
      if (accept('[')) {
        let length = -1;
        if (!is(']')) {
          const size = expr();
          if (size.k !== 'num')
            fail('Array sizes must be plain numbers here.', peek(), 'unsupported');
          length = (size as { value: number }).value;
        }
        expect(']');
        if (is('['))
          fail('Arrays with two dimensions are not supported yet.', peek(), 'unsupported');
        if (accept('=')) {
          expect('{');
          v.items = [];
          if (!is('}')) {
            do v.items.push(expr());
            while (accept(','));
          }
          expect('}');
        }
        v.length = length < 0 ? (v.items?.length ?? 0) : length;
        if (!v.length) fail('This array needs a size.');
      } else if (accept('=')) {
        v.init = expr();
      }
      vars.push(v);
    } while (accept(','));
    return vars;
  }

  function declaration(): Stmt {
    const at = pos();
    const isConst = accept('const');
    const ty = type();
    if (ty === 'void') fail('A variable cannot be void.');
    const vars = declarators(ty, isConst);
    expect(';');
    return { ...at, k: 'decl', vars };
  }

  function block(): Stmt & { k: 'block' } {
    const at = pos();
    expect('{');
    const body: Stmt[] = [];
    while (!is('}')) {
      if (peek().kind === 'eof') fail('A { was never closed. Add a matching }.');
      body.push(statement());
    }
    p += 1;
    return { ...at, k: 'block', body };
  }

  function statement(): Stmt {
    const t = peek();
    const at = pos(t);
    checkWord(t);
    if (is('{')) return block();
    if (startsType()) return declaration();
    if (accept('if')) {
      expect('(');
      const test = expr();
      expect(')');
      const yes = statement();
      const no = accept('else') ? statement() : undefined;
      return no ? { ...at, k: 'if', test, yes, no } : { ...at, k: 'if', test, yes };
    }
    if (accept('while')) {
      expect('(');
      const test = expr();
      expect(')');
      return { ...at, k: 'while', test, body: statement() };
    }
    if (accept('do')) {
      const body = statement();
      expect('while');
      expect('(');
      const test = expr();
      expect(')');
      expect(';');
      return { ...at, k: 'do', test, body };
    }
    if (accept('for')) {
      expect('(');
      let init: Stmt | undefined;
      if (startsType()) init = declaration();
      else if (!accept(';')) {
        init = { ...pos(), k: 'expr', expr: expr() };
        expect(';');
      }
      const test = is(';') ? undefined : expr();
      expect(';');
      const step = is(')') ? undefined : expr();
      expect(')');
      const body = statement();
      return {
        ...at,
        k: 'for',
        body,
        ...(init ? { init } : {}),
        ...(test ? { test } : {}),
        ...(step ? { step } : {}),
      };
    }
    if (accept('switch')) {
      expect('(');
      const test = expr();
      expect(')');
      expect('{');
      const cases: { value?: Expr; body: Stmt[] }[] = [];
      while (!accept('}')) {
        if (accept('case')) {
          const value = expr();
          expect(':');
          cases.push({ value, body: [] });
        } else if (accept('default')) {
          expect(':');
          cases.push({ body: [] });
        } else {
          const current = cases.at(-1);
          if (!current) fail('Expected case here.');
          current!.body.push(statement());
        }
      }
      return { ...at, k: 'switch', test, cases };
    }
    if (accept('break')) {
      expect(';');
      return { ...at, k: 'break' };
    }
    if (accept('continue')) {
      expect(';');
      return { ...at, k: 'continue' };
    }
    if (accept('return')) {
      const value = is(';') ? undefined : expr();
      expect(';');
      return value ? { ...at, k: 'return', value } : { ...at, k: 'return' };
    }
    const e = expr();
    expect(';');
    return { ...at, k: 'expr', expr: e };
  }

  const unit: Unit = { servos: [], globals: [], functions: [] };
  while (peek().kind !== 'eof') {
    checkWord(peek());
    if (accept('Servo')) {
      unit.servos.push(name());
      expect(';');
      continue;
    }
    if (!startsType()) fail(`Expected a variable or function here, not ${peek().text}.`);
    const at = pos();
    const save = p;
    accept('const');
    const ty = type();
    if (peek().kind === 'id' && is('(', 1)) {
      const fname = name();
      expect('(');
      const params: { name: string; type: CType }[] = [];
      if (is('void') && is(')', 1)) p += 1;
      else if (!is(')')) {
        do {
          const pt = type();
          params.push({ type: pt, name: name() });
          if (is('['))
            fail(
              'Array parameters need the AVR engine, planned for a later phase.',
              peek(),
              'unsupported',
            );
        } while (accept(','));
      }
      expect(')');
      if (accept(';')) continue; // A prototype adds nothing: functions are resolved in a second pass.
      unit.functions.push({ ...at, name: fname, type: ty, params, body: block() });
    } else {
      p = save;
      const d = declaration();
      if (d.k === 'decl') unit.globals.push(...d.vars);
    }
  }
  return unit;
}
