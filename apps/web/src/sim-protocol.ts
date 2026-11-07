import type { CircuitDocument } from '@pin-thirteen/circuit-core';
import type { ComponentInput, SimulationState } from '@pin-thirteen/sim-core';

export type WorkerRequest =
  | {
      type: 'start';
      engine: 'educational' | 'avr';
      toolchain: string;
      circuit: CircuitDocument;
      sketch: string;
      inputs: ComponentInput[];
    }
  | { type: 'circuit'; circuit: CircuitDocument }
  | { type: 'input'; input: ComponentInput }
  | { type: 'serial'; text: string };

export type WorkerResponse =
  | { type: 'state'; state: SimulationState; serial: string }
  | { type: 'compiled'; milliseconds: number }
  | { type: 'compile-error'; line: number; message: string };
