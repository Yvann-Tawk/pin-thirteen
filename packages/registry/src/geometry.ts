import type {
  BoardPlacement,
  CircuitDocument,
  ComponentInstance,
  InstanceId,
  PinId,
  Point,
  Rotation,
} from '@pin-thirteen/circuit-core';
import type { ComponentDefinition, PinDefinition } from './types';

type Lookup = { get(id: string): ComponentDefinition | undefined };

const SEAT_DISTANCE = 15;

function rotate(p: Point, rotation: Rotation): Point {
  if (rotation === 90) return { x: -p.y, y: p.x };
  if (rotation === 180) return { x: -p.x, y: -p.y };
  if (rotation === 270) return { x: p.y, y: -p.x };
  return p;
}

export function pinWorld(component: ComponentInstance, pin: PinDefinition): Point {
  const r = rotate(pin.position, component.rotation);
  return { x: component.position.x + r.x, y: component.position.y + r.y };
}

export interface PinHit {
  instance: InstanceId;
  pin: PinId;
  world: Point;
  label: string;
}

/** Arithmetic hit-testing, so 830 holes never need 830 DOM nodes. */
export function findPinAt(
  doc: CircuitDocument,
  registry: Lookup,
  point: Point,
  radius = 7,
): PinHit | undefined {
  let best: PinHit | undefined;
  let bestDistance = radius;
  // Later components draw on top, so they win ties.
  for (const component of doc.components) {
    const definition = registry.get(component.type);
    if (!definition) continue;
    for (const pin of definition.pins) {
      const world = pinWorld(component, pin);
      const distance = Math.hypot(world.x - point.x, world.y - point.y);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = { instance: component.id, pin: pin.id, world, label: pin.label };
      }
    }
  }
  return best;
}

export function pinPosition(
  doc: CircuitDocument,
  registry: Lookup,
  instance: InstanceId,
  pinId: PinId,
): Point | undefined {
  const component = doc.components.find((c) => c.id === instance);
  const pin = component && registry.get(component.type)?.pins.find((p) => p.id === pinId);
  return component && pin ? pinWorld(component, pin) : undefined;
}

export interface Seat {
  position: Point;
  placement: BoardPlacement;
}

/** Finds free holes for all of a component's pins, or undefined if it does not fit here. */
export function seatOnBoard(
  doc: CircuitDocument,
  registry: Lookup,
  component: ComponentInstance,
): Seat | undefined {
  const definition = registry.get(component.type);
  if (!definition || definition.isBoard || definition.category === 'board') return undefined;
  for (const board of doc.components) {
    const boardDefinition = registry.get(board.type);
    if (!boardDefinition?.isBoard || board.id === component.id) continue;
    const used = new Set(
      doc.components
        .filter((c) => c.id !== component.id && c.placement?.board === board.id)
        .flatMap((c) => Object.values(c.placement!.pins)),
    );
    const holes = boardDefinition.pins
      .filter((h) => !used.has(h.id))
      .map((h) => ({ id: h.id, world: pinWorld(board, h) }));
    const nearest = (p: Point, skip?: string) => {
      let found: (typeof holes)[number] | undefined;
      let distance = SEAT_DISTANCE;
      for (const hole of holes) {
        const d = Math.hypot(hole.world.x - p.x, hole.world.y - p.y);
        if (hole.id !== skip && d <= distance) {
          distance = d;
          found = hole;
        }
      }
      return found;
    };
    const [first, ...others] = definition.pins;
    if (!first) continue;
    const firstWorld = pinWorld(component, first);
    const anchor = nearest(firstWorld);
    if (!anchor) continue;
    // Pull the part so its first pin lands exactly in the hole.
    const position = {
      x: component.position.x + anchor.world.x - firstWorld.x,
      y: component.position.y + anchor.world.y - firstWorld.y,
    };
    const moved = { ...component, position };
    const pins: Record<PinId, PinId> = { [first.id]: anchor.id };
    const taken = new Set([anchor.id]);
    let fits = true;
    for (const pin of others) {
      const hole = nearest(pinWorld(moved, pin));
      if (!hole || taken.has(hole.id)) {
        fits = false;
        break;
      }
      pins[pin.id] = hole.id;
      taken.add(hole.id);
    }
    if (fits) return { position, placement: { board: board.id, pins } };
  }
  return undefined;
}
