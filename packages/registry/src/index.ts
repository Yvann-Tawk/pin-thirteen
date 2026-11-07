import type { ComponentTypeId } from '@pin-thirteen/circuit-core';
import { breadboard830 } from './components/breadboard-830';
import { led5mm } from './components/led-5mm';
import { potentiometer } from './components/potentiometer';
import { pushButton } from './components/push-button';
import { resistor } from './components/resistor';
import { unoR3 } from './components/uno-r3';
import type { ComponentDefinition } from './types';

export * from './types';
export * from './geometry';

export class Registry {
  private readonly byId = new Map<ComponentTypeId, ComponentDefinition>();

  constructor(definitions: ComponentDefinition[]) {
    for (const definition of definitions) {
      if (this.byId.has(definition.id)) throw new Error(`Duplicate component: ${definition.id}`);
      this.byId.set(definition.id, definition);
    }
  }

  get(id: ComponentTypeId): ComponentDefinition | undefined {
    return this.byId.get(id);
  }

  all(): ComponentDefinition[] {
    return [...this.byId.values()];
  }
}

export const registry = new Registry([
  unoR3,
  breadboard830,
  led5mm,
  resistor,
  pushButton,
  potentiometer,
]);
