export type CType = 'void' | 'bool' | 'char' | 'byte' | 'int' | 'uint' | 'long' | 'ulong' | 'float';

export interface Diagnostic {
  line: number;
  column: number;
  message: string;
  /** `unsupported` means valid Arduino code that this engine does not run. */
  kind: 'syntax' | 'type' | 'unsupported';
}

export class CompileError extends Error {
  constructor(readonly diagnostic: Diagnostic) {
    super(diagnostic.message);
  }
}

export function wrap(value: number, type: CType): number {
  switch (type) {
    case 'bool':
      return value ? 1 : 0;
    case 'char':
      return (Math.trunc(value) << 24) >> 24;
    case 'byte':
      return Math.trunc(value) & 0xff;
    case 'int':
      return (Math.trunc(value) << 16) >> 16;
    case 'uint':
      return Math.trunc(value) & 0xffff;
    case 'long':
      return Math.trunc(value) | 0;
    case 'ulong':
      return Math.trunc(value) >>> 0;
    case 'float':
      return Math.fround(value);
    default:
      return value;
  }
}
