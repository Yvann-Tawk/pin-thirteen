import type { CircuitDocument, InstanceId } from '@pin-thirteen/circuit-core';

export type EngineId = 'educational' | 'avr';

export interface EngineCapabilities {
  languageSubset: boolean;
  cycleAccurate: boolean;
}

export type ComponentInput =
  | { instance: InstanceId; kind: 'press'; pressed: boolean }
  | { instance: InstanceId; kind: 'turn'; position: number }
  | { instance: InstanceId; kind: 'channel'; channel: string; value: number };

export interface ComponentState {
  /** 0 to 1. Unlit parts report 0. */
  brightness: number;
  milliamps?: number;
  /** Short text such as 90° or 440 Hz, shown beside the part. */
  readout?: string;
  /** Lit segment pins, for displays. */
  segments?: string[];
  /** Tone being played, for audio output. */
  frequency?: number;
}

export interface SimulationState {
  running: boolean;
  virtualMicros: number;
  line: number;
  components: Record<InstanceId, ComponentState>;
  builtinLed: number;
  fault: { line: number; message: string } | null;
  notices: string[];
}

export type SimulationEvent =
  { type: 'serial'; text: string } | { type: 'state'; state: SimulationState };

export interface SimulationEngine<TProgram> {
  readonly id: EngineId;
  readonly capabilities: EngineCapabilities;
  initialize(circuit: CircuitDocument): Promise<void>;
  /** Applies circuit edits during a run, so unplugging a wire takes effect at once. */
  updateCircuit(circuit: CircuitDocument): void;
  loadProgram(program: TProgram): Promise<void>;
  start(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  reset(): Promise<void>;
  /** Advances virtual time. Deterministic, so tests need no real clock. */
  advance(virtualMicros: number): void;
  sendInput(input: ComponentInput): void;
  writeSerial(text: string): void;
  getState(): SimulationState;
  subscribe(listener: (event: SimulationEvent) => void): () => void;
  dispose(): Promise<void>;
}
