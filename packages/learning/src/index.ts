import type { CircuitDocument } from '@pin-thirteen/circuit-core';
import type { ComponentDefinition } from '@pin-thirteen/registry';
import { CircuitModel, type Inputs, type PinDrive } from '@pin-thirteen/sim-core';
import { validate } from '@pin-thirteen/validation';

export { LESSONS } from '../../../content/lessons/index';

export const STEP_KINDS = [
  'introduction',
  'theory',
  'components',
  'assembly',
  'programming',
  'experiment',
  'verification',
  'recap',
] as const;
export type StepKind = (typeof STEP_KINDS)[number];

export interface LessonStep {
  kind: StepKind;
  title: string;
  body: string[];
}

export type Check =
  | { type: 'circuit.hasPart'; part: string; label: string }
  | { type: 'circuit.noErrors'; label: string }
  | { type: 'circuit.ledCanLight'; gpio?: number; label: string }
  | { type: 'circuit.pinTouches'; gpio: number; part: string; label: string }
  | { type: 'sketch.calls'; name: string; label: string }
  | { type: 'sim.ledBlinked'; minTransitions: number; label: string }
  | { type: 'sim.ledDimmed'; label: string }
  | { type: 'sim.serialPrinted'; label: string }
  | { type: 'sim.serialVaried'; label: string };

export interface Lesson {
  id: string;
  number: number;
  title: string;
  summary: string;
  mode: 'theory' | 'build' | 'build-code';
  parts: string[];
  /** Anything not yet runnable is labelled, so no lesson implies more than the engine does. */
  support: 'full' | 'approximate';
  sketch?: string;
  steps: LessonStep[];
  verify: Check[];
}

/** What the running simulation has shown so far. Reset on each Run. */
export interface Observed {
  ledTransitions: number;
  brightnessLevels: number;
  serial: string;
}

export const noObservations = (): Observed => ({
  ledTransitions: 0,
  brightnessLevels: 0,
  serial: '',
});

export interface CheckContext {
  doc: CircuitDocument;
  sketch: string;
  observed: Observed;
  registry: { get(id: string): ComponentDefinition | undefined };
}

function driven(model: CircuitModel, gpio?: number): Inputs {
  const pins = new Map<number, PinDrive>();
  for (let pin = 0; pin < 20; pin++) {
    if (model.gpioNode(pin) && (gpio === undefined || gpio === pin)) {
      pins.set(pin, { mode: 'output', level: 1 });
    }
  }
  return { pins, pressed: new Set(), turned: new Map() };
}

export function evaluate(check: Check, ctx: CheckContext): boolean {
  const { doc, sketch, observed, registry } = ctx;
  switch (check.type) {
    case 'circuit.hasPart':
      return doc.components.some((c) => c.type === check.part);
    case 'circuit.noErrors':
      return !validate(doc, registry).some((f) => f.severity === 'error');
    case 'circuit.ledCanLight': {
      const model = new CircuitModel(doc, registry);
      return model.solve(driven(model, check.gpio)).diodes.some((d) => d.on);
    }
    case 'circuit.pinTouches': {
      const model = new CircuitModel(doc, registry);
      const node = model.gpioNode(check.gpio);
      return model.components.some(
        ({ c, d }) => c.type === check.part && d.pins.some((p) => model.node(c.id, p.id) === node),
      );
    }
    case 'sketch.calls':
      return new RegExp(`\\b${check.name.replace('.', '\\.')}\\s*\\(`).test(stripComments(sketch));
    case 'sim.ledBlinked':
      return observed.ledTransitions >= check.minTransitions;
    case 'sim.ledDimmed':
      return observed.brightnessLevels >= 3;
    case 'sim.serialPrinted':
      return observed.serial.trim().length > 0;
    case 'sim.serialVaried':
      return new Set(observed.serial.split(/\s+/).filter(Boolean)).size >= 2;
  }
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

export const lessonPassed = (lesson: Lesson, ctx: CheckContext) =>
  lesson.verify.every((c) => evaluate(c, ctx));

/** A stable stream, so achievements could subscribe later without touching any lesson. */
export type LearningEvent =
  { type: 'lesson.started'; lesson: string } | { type: 'lesson.completed'; lesson: string };
