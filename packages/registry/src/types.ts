import type { ComponentTypeId, ParamValue, PinId } from '@pin-thirteen/circuit-core';

export type Category = 'board' | 'passive' | 'output' | 'input' | 'display' | 'driver' | 'tool';
export type EngineId = 'educational' | 'avr';
export type SupportLevel = 'full' | 'partial' | 'approximate' | 'planned' | 'unsupported';
export type PinRole = 'power' | 'ground' | 'digital' | 'analog' | 'passive' | 'reset' | 'reference';

export interface PinDefinition {
  id: PinId;
  label: string;
  role: PinRole;
  /** Position in the component's own art coordinates. */
  position: { x: number; y: number };
  note?: string;
  /** Only UNO pins with hardware PWM set this. */
  pwm?: boolean;
  /** Arduino pin number, for programmable pins. A0 is 14. */
  gpio?: number;
  /** Fixed supply voltage, for power and ground pins. */
  volts?: number;
}

export interface Spec {
  label: string;
  value: string;
}

export interface ParamDefinition {
  key: string;
  label: string;
  default: ParamValue;
  unit?: string;
}

export interface ElectricalConstraint {
  id: string;
  description: string;
}

/** How a part behaves in the circuit solver. New parts add data here, not special cases. */
export type ElectricalModel =
  | { kind: 'resistor'; a: PinId; b: PinId; ohmsParam: string }
  | { kind: 'diode'; anode: PinId; cathode: PinId; forwardVolts: number }
  | { kind: 'switch'; a: PinId; b: PinId }
  | { kind: 'divider'; endA: PinId; endB: PinId; wiper: PinId; ohmsParam: string };

export type Interaction = { kind: 'press' } | { kind: 'turn' };

export interface SupportEntry {
  level: SupportLevel;
  note: string;
}

export interface ComponentDefinition {
  id: ComponentTypeId;
  name: string;
  identifier: string;
  category: Category;
  kind: 'circuit' | 'tool';
  description: string;
  specs: Spec[];
  params: ParamDefinition[];
  pins: PinDefinition[];
  /** Groups of pins joined inside the part, such as breadboard strips. */
  connectivity?: PinId[][];
  electrical?: ElectricalModel;
  interaction?: Interaction;
  constraints: ElectricalConstraint[];
  /** Key into the UI's art table. The registry holds no drawing code. */
  art: string;
  /** Other parts can seat their pins in this component's holes. */
  isBoard?: boolean;
  simulation: Record<EngineId, SupportEntry>;
  provenance: { hardwareTested: boolean; sources: string[] };
}
