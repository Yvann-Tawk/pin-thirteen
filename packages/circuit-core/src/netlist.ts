import type { CircuitDocument, ComponentTypeId, InstanceId, PinId } from './model';

export type PinKey = `${InstanceId}:${PinId}`;
export const pinKey = (instance: InstanceId, pin: PinId): PinKey => `${instance}:${pin}`;

export interface Netlist {
  /** Each net is a set of electrically joined pins. Single-pin nets are omitted. */
  nets: PinKey[][];
  netOf(key: PinKey): PinKey[] | undefined;
}

/** Supplies internal connections, so this package needs no knowledge of the registry. */
export type ConnectivityLookup = (type: ComponentTypeId) => PinId[][] | undefined;

export function buildNetlist(doc: CircuitDocument, connectivity: ConnectivityLookup): Netlist {
  const parent = new Map<PinKey, PinKey>();
  const find = (key: PinKey): PinKey => {
    let root = key;
    while (parent.get(root) !== undefined && parent.get(root) !== root) root = parent.get(root)!;
    parent.set(key, root);
    return root;
  };
  const union = (a: PinKey, b: PinKey) => parent.set(find(a), find(b));

  for (const component of doc.components) {
    for (const group of connectivity(component.type) ?? []) {
      const [first, ...rest] = group;
      if (!first) continue;
      for (const pin of rest) union(pinKey(component.id, first), pinKey(component.id, pin));
    }
    if (component.placement) {
      for (const [pin, hole] of Object.entries(component.placement.pins)) {
        union(pinKey(component.id, pin), pinKey(component.placement.board, hole));
      }
    }
  }
  for (const wire of doc.wires) {
    union(pinKey(wire.from.instance, wire.from.pin), pinKey(wire.to.instance, wire.to.pin));
  }

  const groups = new Map<PinKey, PinKey[]>();
  for (const key of parent.keys()) {
    const root = find(key);
    groups.set(root, [...(groups.get(root) ?? []), key]);
  }
  const nets = [...groups.values()].filter((net) => net.length > 1);
  const lookup = new Map<PinKey, PinKey[]>();
  for (const net of nets) for (const key of net) lookup.set(key, net);
  return { nets, netOf: (key) => lookup.get(key) };
}
