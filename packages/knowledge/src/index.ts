import type { PinDefinition } from '@pin-thirteen/registry';
import { ARTICLES, FINDING_ARTICLES, FUNCTION_DOCS } from '../../../content/knowledge/index';

export { ARTICLES, FINDING_ARTICLES, FUNCTION_DOCS };

export interface Article {
  id: string;
  /** Registry id when this article describes a circuit part. */
  part?: string;
  /** Physical tools are reference material and are never simulated. */
  tool?: boolean;
  title: string;
  what: string;
  does: string;
  how: string;
  applications: string[];
  wiring: string;
  code?: string;
  mistakes: string[];
  troubleshooting: string[];
  lessons: string[];
}

export const articleFor = (id: string) => ARTICLES.find((a) => a.id === id || a.part === id);

/** Rule-based help. An optional AI provider could sit behind this same function later. */
export function explainPin(pin: PinDefinition): string {
  if (pin.role === 'ground') return 'GND is the return path. Every circuit needs one.';
  if (pin.volts !== undefined)
    return `This pin supplies a fixed ${pin.volts} V. Never join it to GND.`;
  if (pin.gpio !== undefined && pin.gpio >= 14)
    return `${pin.label} measures a voltage with analogRead().`;
  if (pin.pwm) return `Pin ${pin.label} is digital, and can also do PWM with analogWrite().`;
  if (pin.gpio !== undefined) return `Pin ${pin.label} is digital: HIGH, LOW, input or output.`;
  return pin.note ?? `Pin ${pin.label}.`;
}

export function searchArticles(query: string): Article[] {
  const q = query.trim().toLowerCase();
  if (!q) return ARTICLES;
  return ARTICLES.filter((a) =>
    [a.title, a.what, a.does, a.how, ...a.mistakes].join(' ').toLowerCase().includes(q),
  );
}
