import type { CircuitDocument } from '@pin-thirteen/circuit-core';
import type { ComponentInput, SimulationState } from '@pin-thirteen/sim-core';

export type WorkerRequest =
  | { type: 'start'; circuit: CircuitDocument; sketch: string; inputs: ComponentInput[] }
  | { type: 'circuit'; circuit: CircuitDocument }
  | { type: 'input'; input: ComponentInput }
  | { type: 'serial'; text: string };

export type WorkerResponse = { type: 'state'; state: SimulationState; serial: string };
