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
  constraints: ElectricalConstraint[];
  /** Key into the UI's art table. The registry holds no drawing code. */
  art: string;
  /** Other parts can seat their pins in this component's holes. */
  isBoard?: boolean;
  simulation: Record<EngineId, SupportEntry>;
  provenance: { hardwareTested: boolean; sources: string[] };
}
