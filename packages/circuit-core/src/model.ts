export type InstanceId = string;
export type WireId = string;
export type ComponentTypeId = string;
export type PinId = string;
export type ParamValue = string | number | boolean;
export type Rotation = 0 | 90 | 180 | 270;

export interface Point {
  x: number;
  y: number;
}

export interface ComponentInstance {
  id: InstanceId;
  type: ComponentTypeId;
  position: Point;
  rotation: Rotation;
  params: Record<string, ParamValue>;
  /** Set when the component's pins sit in a breadboard's holes. */
  placement?: BoardPlacement;
}

export interface BoardPlacement {
  board: InstanceId;
  pins: Record<PinId, PinId>;
}

export interface Endpoint {
  instance: InstanceId;
  pin: PinId;
}

export interface Wire {
  id: WireId;
  from: Endpoint;
  to: Endpoint;
  style: { colour: 'apricot' | 'mint' | 'yellow' | 'blue' };
}

/** What the user built. Nets are derived from this and never saved. */
export interface CircuitDocument {
  components: ComponentInstance[];
  wires: Wire[];
}

export const emptyCircuit = (): CircuitDocument => ({ components: [], wires: [] });
