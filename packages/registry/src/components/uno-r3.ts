import type { ComponentDefinition, PinDefinition } from '../types';

const row = (y: number, startX: number, pins: Omit<PinDefinition, 'position'>[]): PinDefinition[] =>
  pins.map((pin, i) => ({ ...pin, position: { x: startX + i * 10, y } }));

const digital = (n: number, pwm = false): Omit<PinDefinition, 'position'> => ({
  id: `D${n}`,
  label: String(n),
  role: 'digital',
  gpio: n,
  ...(pwm ? { pwm } : {}),
});

const analog = (n: number): Omit<PinDefinition, 'position'> => ({
  id: `A${n}`,
  label: `A${n}`,
  role: 'analog',
  gpio: 14 + n,
});

export const unoR3: ComponentDefinition = {
  id: 'uno-r3',
  name: 'UNO R3',
  identifier: 'ATMEGA328P',
  category: 'board',
  kind: 'circuit',
  description: 'A microcontroller board compatible with Arduino sketches.',
  specs: [
    { label: 'Microcontroller', value: 'ATmega328P' },
    { label: 'Clock', value: '16 MHz' },
    { label: 'Logic level', value: '5 V' },
    { label: 'Flash', value: '32 KB' },
    { label: 'SRAM', value: '2 KB' },
    { label: 'Analog resolution', value: '10-bit (0 to 1023)' },
  ],
  params: [],
  // Header order follows the board with the USB socket on the left.
  pins: [
    ...row(16, 153, [
      { id: 'SCL', label: 'SCL', role: 'digital' },
      { id: 'SDA', label: 'SDA', role: 'digital' },
      { id: 'AREF', label: 'AREF', role: 'reference' },
      { id: 'GND_TOP', label: 'GND', role: 'ground', volts: 0 },
      digital(13),
      digital(12),
      digital(11, true),
      digital(10, true),
      digital(9, true),
      digital(8),
    ]),
    ...row(16, 269, [
      digital(7),
      digital(6, true),
      digital(5, true),
      digital(4),
      digital(3, true),
      digital(2),
      { ...digital(1), label: 'TX', note: 'Shared with USB serial.' },
      { ...digital(0), label: 'RX', note: 'Shared with USB serial.' },
    ]),
    ...row(273, 157, [
      { id: 'IOREF', label: 'IOREF', role: 'reference' },
      { id: 'RESET', label: 'RST', role: 'reset' },
      { id: '3V3', label: '3V3', role: 'power', volts: 3.3 },
      { id: '5V', label: '5V', role: 'power', volts: 5 },
      { id: 'GND_1', label: 'GND', role: 'ground', volts: 0 },
      { id: 'GND_2', label: 'GND', role: 'ground', volts: 0 },
      { id: 'VIN', label: 'VIN', role: 'power' },
    ]),
    ...row(273, 273, [0, 1, 2, 3, 4, 5].map(analog)),
  ],
  connectivity: [['GND_TOP', 'GND_1', 'GND_2']],
  constraints: [
    { id: 'pin-current', description: 'Keep each I/O pin well below the 40 mA absolute maximum.' },
    { id: 'logic-voltage', description: 'I/O pins must stay between 0 V and 5 V.' },
  ],
  art: 'uno-r3',
  simulation: {
    educational: {
      level: 'partial',
      note: 'Runs the supported sketch subset. Timing is approximate.',
    },
    avr: { level: 'planned', note: 'Planned for Phase 7.' },
  },
  provenance: { hardwareTested: false, sources: ['ATmega328P datasheet'] },
};
