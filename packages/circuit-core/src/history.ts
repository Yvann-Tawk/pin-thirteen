import type { Command } from './commands';
import type { CircuitDocument } from './model';

/** Documents are immutable, so history can simply hold references to each version. */
export interface History {
  past: CircuitDocument[];
  present: CircuitDocument;
  future: CircuitDocument[];
}

export const startHistory = (present: CircuitDocument): History => ({
  past: [],
  present,
  future: [],
});

export const execute = (h: History, command: Command): History => ({
  past: [...h.past, h.present],
  present: command.apply(h.present),
  future: [],
});

export function undo(h: History): History {
  const previous = h.past.at(-1);
  if (!previous) return h;
  return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] };
}

export function redo(h: History): History {
  const [next, ...rest] = h.future;
  if (!next) return h;
  return { past: [...h.past, h.present], present: next, future: rest };
}
