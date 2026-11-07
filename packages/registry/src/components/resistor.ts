import type { ComponentDefinition } from '../types';

export const resistor: ComponentDefinition = {
  id: 'resistor',
  name: 'Resistor',
  identifier: 'R-AXIAL',
  category: 'passive',
  kind: 'circuit',
  description: 'Limits current. It works the same in either direction.',
  specs: [{ label: 'Value', value: 'Set per instance; kit values are not yet confirmed' }],
  // Placeholder default until the kit's resistor values are confirmed.
  params: [{ key: 'resistanceOhms', label: 'Resistance', default: 220, unit: 'Ω' }],
  pins: [
    { id: 'a', label: '1', role: 'passive', position: { x: -54, y: 0 } },
    { id: 'b', label: '2', role: 'passive', position: { x: 54, y: 0 } },
  ],
  constraints: [],
  art: 'resistor',
  simulation: {
    educational: { level: 'planned', note: 'Arrives with the educational engine in Phase 3.' },
    avr: { level: 'planned', note: 'Planned for Phase 7.' },
  },
  provenance: { hardwareTested: false, sources: [] },
};
