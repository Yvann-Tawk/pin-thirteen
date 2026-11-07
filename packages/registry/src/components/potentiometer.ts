import type { ComponentDefinition } from '../types';

export const potentiometer: ComponentDefinition = {
  id: 'potentiometer',
  name: 'Potentiometer',
  identifier: 'POT-10K',
  category: 'input',
  kind: 'circuit',
  description: 'A turnable voltage divider. The middle pin moves between the two end pins.',
  specs: [{ label: 'Total resistance', value: '10 kΩ' }],
  params: [{ key: 'ohms', label: 'Total resistance', default: 10000, unit: 'Ω' }],
  pins: [
    { id: 'a', label: '1', role: 'passive', position: { x: -13.6, y: 34 } },
    { id: 'wiper', label: 'W', role: 'passive', position: { x: 0, y: 34 } },
    { id: 'b', label: '3', role: 'passive', position: { x: 13.6, y: 34 } },
  ],
  electrical: { kind: 'divider', endA: 'a', endB: 'b', wiper: 'wiper', ohmsParam: 'ohms' },
  interaction: { kind: 'turn' },
  constraints: [],
  art: 'potentiometer',
  simulation: {
    educational: { level: 'approximate', note: 'Unloaded divider. Linear taper.' },
    avr: { level: 'planned', note: 'Planned for Phase 7.' },
  },
  provenance: { hardwareTested: false, sources: [] },
};
