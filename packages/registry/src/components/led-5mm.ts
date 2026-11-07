import type { ComponentDefinition } from '../types';

export const led5mm: ComponentDefinition = {
  id: 'led-5mm',
  name: 'LED',
  identifier: 'LED-5MM',
  category: 'output',
  kind: 'circuit',
  description: 'A diode that lights up when current flows from anode to cathode.',
  specs: [
    { label: 'Typical forward voltage', value: 'About 2 V, varies by colour' },
    { label: 'Typical current', value: '10 to 20 mA' },
  ],
  params: [{ key: 'colour', label: 'Colour', default: 'yellow' }],
  pins: [
    { id: 'anode', label: '+', role: 'passive', position: { x: -6, y: 52 }, note: 'Long leg.' },
    { id: 'cathode', label: '-', role: 'passive', position: { x: 7, y: 42 }, note: 'Short leg.' },
  ],
  constraints: [
    { id: 'polarity', description: 'Current only flows from anode to cathode.' },
    { id: 'current-limit', description: 'Needs a series resistor to limit current.' },
  ],
  art: 'led-5mm',
  simulation: {
    educational: { level: 'planned', note: 'Arrives with the educational engine in Phase 3.' },
    avr: { level: 'planned', note: 'Planned for Phase 7.' },
  },
  provenance: { hardwareTested: false, sources: [] },
};
