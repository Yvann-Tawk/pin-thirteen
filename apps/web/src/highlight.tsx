import type { ReactNode } from 'react';

const TOKEN =
  /\b(void|int|long|bool|byte|float|char|const|unsigned)\b|\b(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|LED_BUILTIN)\b|\b([a-zA-Z_]\w*)(?=\()|\b(\d+)\b/g;

/** Display colouring only. It says nothing about whether the code can run. */
export function highlight(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(TOKEN)) {
    out.push(line.slice(last, m.index));
    const cls = m[1] ? 'k' : m[2] ? 'c-t' : m[3] ? 'f' : 'n';
    out.push(
      <span className={cls} key={m.index}>
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  out.push(line.slice(last));
  return out;
}
