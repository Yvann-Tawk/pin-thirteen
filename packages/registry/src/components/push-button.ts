import type { ComponentDefinition } from '../types';

export const pushButton: ComponentDefinition = {
  id: 'push-button',
  name: 'Push Button',
  identifier: 'SW-TACT',
  category: 'input',
  kind: 'circuit',
  description: 'Joins its two sides while pressed. Each side has two legs that are always joined.',
  specs: [{ label: 'Type', value: 'Momentary, normally open' }],
  params: [],
  pins: [
    { id: 'a1', label: 'A', role: 'passive', position: { x: -34, y: -13 } },
    { id: 'b1', label: 'B', role: 'passive', position: { x: 34, y: -13 } },
    { id: 'a2', label: 'A', role: 'passive', position: { x: -34, y: 13 } },
    { id: 'b2', label: 'B', role: 'passive', position: { x: 34, y: 13 } },
  ],
  connectivity: [
    ['a1', 'a2'],
    ['b1', 'b2'],
  ],
  electrical: { kind: 'switch', a: 'a1', b: 'b1' },
  interaction: { kind: 'press' },
  constraints: [],
  art: 'push-button',
  simulation: {
    educational: { level: 'full', note: 'Ideal contact. Bounce is not modelled.' },
    avr: { level: 'planned', note: 'Planned for Phase 7.' },
  },
  provenance: { hardwareTested: false, sources: [] },
};
