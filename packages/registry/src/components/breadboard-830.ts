import type { ComponentDefinition, PinDefinition } from '../types';

export const BOARD_PITCH = 13.6;
const COLUMNS = 63;
const FIRST_X = 30;
const columnX = (i: number) => FIRST_X + i * BOARD_PITCH;

const TOP_ROWS = { a: 46, b: 57, c: 68, d: 79, e: 90 } as const;
const BOTTOM_ROWS = { f: 106, g: 117, h: 128, i: 139, j: 150 } as const;
const RAILS = [
  { name: 'T+', y: 15, role: 'power' },
  { name: 'T-', y: 27, role: 'ground' },
  { name: 'B+', y: 163, role: 'power' },
  { name: 'B-', y: 175, role: 'ground' },
] as const;

const pins: PinDefinition[] = [];
const connectivity: string[][] = [];

for (let i = 0; i < COLUMNS; i++) {
  for (const rows of [TOP_ROWS, BOTTOM_ROWS]) {
    const strip: string[] = [];
    for (const [row, y] of Object.entries(rows)) {
      const id = `${row}${i + 1}`;
      pins.push({ id, label: id, role: 'passive', position: { x: columnX(i), y } });
      strip.push(id);
    }
    connectivity.push(strip);
  }
}

// 50 holes per rail, in groups of five. Rails are modelled as continuous.
for (const rail of RAILS) {
  const strip: string[] = [];
  let n = 0;
  for (let i = 0; i < 60; i++) {
    if (i % 6 === 5) continue;
    n += 1;
    const id = `${rail.name}${n}`;
    pins.push({ id, label: id, role: 'passive', position: { x: columnX(i), y: rail.y } });
    strip.push(id);
  }
  connectivity.push(strip);
}

export const breadboard830: ComponentDefinition = {
  id: 'breadboard-830',
  name: 'Breadboard',
  identifier: '830 TIE-POINTS',
  category: 'board',
  kind: 'circuit',
  description: 'Holes in each short column are joined, so parts connect without solder.',
  specs: [
    { label: 'Tie-points', value: '830 (630 main, 200 rail)' },
    { label: 'Columns', value: '63, each split into a-e and f-j' },
    { label: 'Rails', value: '4 rails of 50 holes, modelled as continuous' },
  ],
  params: [],
  pins,
  connectivity,
  constraints: [],
  art: 'breadboard-830',
  isBoard: true,
  simulation: {
    educational: { level: 'full', note: 'Connectivity only. Contact faults are not modelled.' },
    avr: { level: 'full', note: 'Connectivity only. Contact faults are not modelled.' },
  },
  provenance: { hardwareTested: false, sources: [] },
};
