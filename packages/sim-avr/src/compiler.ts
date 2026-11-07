/** Thin driver for the optional WebAssembly avr-gcc. Those tools ship separately, under the GPL. */
export interface ToolModule {
  FS: {
    mkdirTree(path: string): void;
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    analyzePath(path: string): { exists: boolean };
  };
  callMain(args: string[]): number;
}

export type LoadTool = (
  name: 'cc1plus' | 'as' | 'ld' | 'objcopy',
  options: { print(s: string): void; printErr(s: string): void },
) => Promise<ToolModule>;

export type CompileOutcome =
  { ok: true; hex: string } | { ok: false; errors: { line: number; message: string }[] };

const decode = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** A simple stand-in for the Arduino preprocessor: it declares top-level functions. */
export function toCpp(ino: string): string {
  const prototypes = [
    ...ino.matchAll(
      /^[ \t]*((?:void|int|long|bool|byte|float|char|unsigned \w+)\s+\w+\s*\([^)]*\))\s*\{/gm,
    ),
  ].map((m) => `${m[1]};`);
  return `#include <Arduino.h>\n${prototypes.join('\n')}\n#line 1 "sketch.ino"\n${ino}`;
}

const CC_FLAGS =
  '-quiet -I/core -I/variant -imultilib avr5 -D__AVR_ATmega328P__ -D__AVR_DEVICE_NAME__=atmega328p -DF_CPU=16000000L -DARDUINO=10607 -DARDUINO_AVR_UNO -DARDUINO_ARCH_AVR /t.cpp -mn-flash=1 -mno-skip-bug -mmcu=avr5 -Os -std=gnu++11 -fpermissive -fno-exceptions -ffunction-sections -fdata-sections -fno-threadsafe-statics -fno-rtti -fno-enforce-eh-specs -o /t.s';
const LD_FLAGS =
  '-mavr5 -T /sysroot/avr/lib/ldscripts/avr5.x -Tdata 0x800100 -o /t.elf /lib/crtatmega328p.o -L/lib --gc-sections /t.o /lib/core.a -lm --start-group -lgcc -lm -lc -latmega328p --end-group';

export function parseGccErrors(lines: string[]): { line: number; message: string }[] {
  return lines.flatMap((l) => {
    const m = /sketch\.ino:(\d+)(?::\d+)?: (?:fatal )?error: (.*)/.exec(l);
    return m ? [{ line: Number(m[1]), message: m[2]! }] : [];
  });
}

export async function compileWithGcc(
  ino: string,
  bundle: Record<string, string>,
  load: LoadTool,
): Promise<CompileOutcome> {
  const step = async (
    name: Parameters<LoadTool>[0],
    args: string[],
    inputs: Record<string, Uint8Array>,
    output: string,
  ) => {
    const log: string[] = [];
    const m = await load(name, { print: (s) => log.push(s), printErr: (s) => log.push(s) });
    for (const [path, data] of Object.entries(inputs)) {
      m.FS.mkdirTree(path.slice(0, path.lastIndexOf('/')) || '/');
      m.FS.writeFile(path, data);
    }
    let code: unknown;
    try {
      code = m.callMain(args);
    } catch (e) {
      code = (e as { status?: number }).status ?? e;
    }
    if (code !== 0 || !m.FS.analyzePath(output).exists) return { log, data: null };
    return { log, data: m.FS.readFile(output) };
  };
  const headers: Record<string, Uint8Array> = {};
  const libraries: Record<string, Uint8Array> = {};
  for (const [path, b64] of Object.entries(bundle)) {
    (path.startsWith('/lib/') || path.includes('ldscripts') ? libraries : headers)[path] =
      decode(b64);
  }
  const text = new TextEncoder();
  const asm = await step(
    'cc1plus',
    CC_FLAGS.split(' '),
    { ...headers, '/t.cpp': text.encode(toCpp(ino)) },
    '/t.s',
  );
  if (!asm.data) {
    const errors = parseGccErrors(asm.log);
    return {
      ok: false,
      errors: errors.length
        ? errors
        : [{ line: 1, message: 'The compiler could not build this sketch.' }],
    };
  }
  const obj = await step(
    'as',
    ['-mmcu=avr5', '-mno-skip-bug', '-o', '/t.o', '/t.s'],
    { '/t.s': asm.data },
    '/t.o',
  );
  const elf =
    obj.data &&
    (await step('ld', LD_FLAGS.split(' '), { ...libraries, '/t.o': obj.data }, '/t.elf'));
  const hex =
    elf?.data &&
    (await step(
      'objcopy',
      ['-O', 'ihex', '-R', '.eeprom', '/t.elf', '/t.hex'],
      { '/t.elf': elf.data },
      '/t.hex',
    ));
  if (!hex?.data)
    return {
      ok: false,
      errors: [
        {
          line: 1,
          message: 'Linking failed. The sketch may need a library that is not available.',
        },
      ],
    };
  return { ok: true, hex: new TextDecoder().decode(hex.data) };
}
