import { CompileError } from './types';

export type TokenKind = 'number' | 'float' | 'id' | 'string' | 'char' | 'op' | 'eof';

export interface Token {
  kind: TokenKind;
  text: string;
  line: number;
  column: number;
  value?: number;
  suffix?: string;
}

const OPS = [
  '<<=',
  '>>=',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '++',
  '--',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '<<',
  '>>',
  '+',
  '-',
  '*',
  '/',
  '%',
  '&',
  '|',
  '^',
  '~',
  '!',
  '<',
  '>',
  '=',
  '(',
  ')',
  '{',
  '}',
  '[',
  ']',
  ';',
  ',',
  '.',
  '?',
  ':',
];

const ESCAPES: Record<string, string> = {
  n: '\n',
  r: '\r',
  t: '\t',
  '0': '\0',
  '\\': '\\',
  "'": "'",
  '"': '"',
};

export function lex(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let lineStart = 0;
  const fail = (message: string, kind: 'syntax' | 'unsupported' = 'syntax'): never => {
    throw new CompileError({ line, column: i - lineStart + 1, message, kind });
  };
  while (i < source.length) {
    const c = source[i]!;
    if (c === '\n') {
      line += 1;
      i += 1;
      lineStart = i;
    } else if (/\s/.test(c)) {
      i += 1;
    } else if (source.startsWith('//', i)) {
      while (i < source.length && source[i] !== '\n') i += 1;
    } else if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) fail('This comment is never closed. Add */ to end it.');
      for (let j = i; j < end; j++) {
        if (source[j] === '\n') {
          line += 1;
          lineStart = j + 1;
        }
      }
      i = end + 2;
    } else if (c === '#') {
      const directive = /^#\s*(\w+)\s*(.*)/.exec(source.slice(i).split('\n')[0] ?? '');
      if (directive?.[1] === 'include') {
        fail(
          `#include ${directive[2]} needs a library, which the educational simulator cannot load yet.`,
          'unsupported',
        );
      }
      fail(
        `#${directive?.[1] ?? ''} is not supported here. Use a const variable instead.`,
        'unsupported',
      );
    } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(source[i + 1] ?? ''))) {
      const start = i;
      const hex = /^0[xX][0-9a-fA-F]+/.exec(source.slice(i));
      const bin = /^0[bB][01]+/.exec(source.slice(i));
      const dec = /^(\d+\.?\d*([eE][+-]?\d+)?|\.\d+([eE][+-]?\d+)?)/.exec(source.slice(i));
      const text = (hex ?? bin ?? dec)![0];
      i += text.length;
      const suffix = /^[uUlLfF]*/.exec(source.slice(i))![0];
      i += suffix.length;
      const isFloat = !hex && !bin && /[.eE]/.test(text);
      const value = isFloat ? Number(text) : bin ? parseInt(text.slice(2), 2) : Number(text);
      tokens.push({
        kind: isFloat ? 'float' : 'number',
        text,
        line,
        column: start - lineStart + 1,
        value,
        suffix: suffix.toLowerCase(),
      });
    } else if (/[A-Za-z_]/.test(c)) {
      const start = i;
      while (/[A-Za-z0-9_]/.test(source[i] ?? '')) i += 1;
      tokens.push({
        kind: 'id',
        text: source.slice(start, i),
        line,
        column: start - lineStart + 1,
      });
    } else if (c === '"' || c === "'") {
      const start = i;
      let text = '';
      i += 1;
      while (source[i] !== c) {
        if (i >= source.length || source[i] === '\n') fail(`Add a closing ${c} on this line.`);
        if (source[i] === '\\') {
          i += 1;
          text += ESCAPES[source[i]!] ?? source[i];
        } else {
          text += source[i];
        }
        i += 1;
      }
      i += 1;
      if (c === "'" && text.length !== 1) fail('A char holds exactly one character.');
      tokens.push({
        kind: c === '"' ? 'string' : 'char',
        text,
        line,
        column: start - lineStart + 1,
        value: text.charCodeAt(0),
      });
    } else {
      const op = OPS.find((o) => source.startsWith(o, i));
      if (!op) fail(`The character ${c} is not valid here.`);
      tokens.push({ kind: 'op', text: op!, line, column: i - lineStart + 1 });
      i += op!.length;
    }
  }
  tokens.push({ kind: 'eof', text: 'end of file', line, column: i - lineStart + 1 });
  return tokens;
}
