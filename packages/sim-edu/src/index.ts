import { generate, type Program } from './codegen';
import { lex } from './lexer';
import { parse } from './parser';
import { CompileError, type Diagnostic } from './types';

export type { Program } from './codegen';
export type { Diagnostic } from './types';
export { Vm, formatFloat, type ArduinoHost, type RuntimeFault } from './vm';

export type CompileResult =
  { ok: true; program: Program } | { ok: false; diagnostics: Diagnostic[] };

/** Stops at the first problem: one clear message suits beginners better than a cascade. */
export function compile(source: string): CompileResult {
  try {
    return { ok: true, program: generate(parse(lex(source))) };
  } catch (e) {
    if (e instanceof CompileError) return { ok: false, diagnostics: [e.diagnostic] };
    throw e;
  }
}
export { EducationalEngine } from './engine';
