import { z } from 'zod';
import type { CircuitDocument } from './model';

export const CURRENT_SCHEMA_VERSION = 1;

export interface Project {
  schemaVersion: number;
  id: string;
  name: string;
  updatedAt: string;
  circuit: CircuitDocument;
  sketch: string;
}

const paramValue = z.union([z.string(), z.number(), z.boolean()]);
const point = z.object({ x: z.number().finite(), y: z.number().finite() });
const endpoint = z.object({ instance: z.string().min(1), pin: z.string().min(1) });

const projectSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    id: z.string().min(1),
    name: z.string().min(1).max(120),
    updatedAt: z.string(),
    sketch: z.string().max(200_000),
    circuit: z.object({
      components: z
        .array(
          z.object({
            id: z.string().min(1),
            type: z.string().min(1),
            position: point,
            rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
            params: z.record(z.string(), paramValue),
            placement: z
              .object({ board: z.string().min(1), pins: z.record(z.string(), z.string()) })
              .optional(),
          }),
        )
        .max(500),
      wires: z
        .array(
          z.object({
            id: z.string().min(1),
            from: endpoint,
            to: endpoint,
            style: z.object({ colour: z.enum(['apricot', 'mint', 'yellow', 'blue']) }),
          }),
        )
        .max(2000),
    }),
  })
  .superRefine((project, ctx) => {
    const ids = new Set(project.circuit.components.map((c) => c.id));
    if (ids.size !== project.circuit.components.length) {
      ctx.addIssue({ code: 'custom', message: 'Two components share an id' });
    }
    for (const wire of project.circuit.wires) {
      if (!ids.has(wire.from.instance) || !ids.has(wire.to.instance)) {
        ctx.addIssue({ code: 'custom', message: `Wire ${wire.id} points at a missing component` });
      }
    }
  });

/** Each entry upgrades one version to the next. Add one for every schema change. */
const migrations: Record<number, (old: Record<string, unknown>) => Record<string, unknown>> = {};

export type ParseResult = { ok: true; project: Project } | { ok: false; message: string };

function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let current = raw;
  while (
    typeof current.schemaVersion === 'number' &&
    current.schemaVersion < CURRENT_SCHEMA_VERSION
  ) {
    const step = migrations[current.schemaVersion];
    if (!step) break;
    current = step(current);
  }
  return current;
}

/** Project files are untrusted input, so nothing is used before it passes validation. */
export function parseProject(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: 'This file is not valid JSON.' };
  }
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, message: 'This file is not a Pin Thirteen project.' };
  }
  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (typeof version === 'number' && version > CURRENT_SCHEMA_VERSION) {
    return { ok: false, message: 'This project was saved by a newer version of Pin Thirteen.' };
  }
  const result = projectSchema.safeParse(migrate(raw as Record<string, unknown>));
  if (!result.success) {
    return { ok: false, message: 'This file is not a valid Pin Thirteen project.' };
  }
  return { ok: true, project: result.data };
}

export const serializeProject = (project: Project): string => JSON.stringify(project, null, 2);
