import type {
  CircuitDocument,
  ComponentInstance,
  InstanceId,
  ParamValue,
  Point,
  Rotation,
  Wire,
  WireId,
} from './model';

/** A pure edit. Throws only for programmer errors, such as an unknown id. */
export interface Command {
  label: string;
  apply(doc: CircuitDocument): CircuitDocument;
}

function requireComponent(doc: CircuitDocument, id: InstanceId): ComponentInstance {
  const found = doc.components.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown component: ${id}`);
  return found;
}

function replace(doc: CircuitDocument, next: ComponentInstance): CircuitDocument {
  return { ...doc, components: doc.components.map((c) => (c.id === next.id ? next : c)) };
}

export const addComponent = (component: ComponentInstance): Command => ({
  label: `Add ${component.type}`,
  apply: (doc) => {
    if (doc.components.some((c) => c.id === component.id)) {
      throw new Error(`Duplicate component: ${component.id}`);
    }
    return { ...doc, components: [...doc.components, component] };
  },
});

export const moveComponent = (id: InstanceId, position: Point): Command => ({
  label: 'Move component',
  apply: (doc) => replace(doc, { ...requireComponent(doc, id), position }),
});

export const rotateComponent = (id: InstanceId, rotation: Rotation): Command => ({
  label: 'Rotate component',
  apply: (doc) => replace(doc, { ...requireComponent(doc, id), rotation }),
});

export const setParam = (id: InstanceId, key: string, value: ParamValue): Command => ({
  label: `Set ${key}`,
  apply: (doc) => {
    const component = requireComponent(doc, id);
    return replace(doc, { ...component, params: { ...component.params, [key]: value } });
  },
});

/** Removing a component also removes every wire attached to it. */
export const removeComponent = (id: InstanceId): Command => ({
  label: 'Remove component',
  apply: (doc) => {
    requireComponent(doc, id);
    return {
      components: doc.components.filter((c) => c.id !== id),
      wires: doc.wires.filter((w) => w.from.instance !== id && w.to.instance !== id),
    };
  },
});

export const addWire = (wire: Wire): Command => ({
  label: 'Add wire',
  apply: (doc) => {
    requireComponent(doc, wire.from.instance);
    requireComponent(doc, wire.to.instance);
    return { ...doc, wires: [...doc.wires, wire] };
  },
});

export const removeWire = (id: WireId): Command => ({
  label: 'Remove wire',
  apply: (doc) => ({ ...doc, wires: doc.wires.filter((w) => w.id !== id) }),
});
