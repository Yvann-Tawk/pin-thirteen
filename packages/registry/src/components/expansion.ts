import type { Channel, ComponentDefinition, ElectricalModel, PinDefinition } from '../types';

const planned = { level: 'planned', note: 'Planned for Phase 7.' } as const;

const row = (labels: string[], y = 34): PinDefinition[] =>
  labels.map((label, i) => ({
    id: label.toLowerCase(),
    label,
    role: label === 'GND' ? 'ground' : 'passive',
    position: { x: (i - (labels.length - 1) / 2) * 13.6, y },
  }));

function module(
  id: string,
  name: string,
  identifier: string,
  description: string,
  pins: PinDefinition[],
  electrical: ElectricalModel,
  note: string,
  channels: Channel[] = [],
  extras: Partial<ComponentDefinition> = {},
): ComponentDefinition {
  return {
    id,
    name,
    identifier,
    category: 'input',
    kind: 'circuit',
    description,
    specs: [],
    params: [],
    pins,
    electrical,
    ...(channels.length ? { interaction: { kind: 'channels' as const, channels } } : {}),
    constraints: [],
    art: 'module',
    simulation: { educational: { level: 'approximate', note }, avr: planned },
    provenance: { hardwareTested: false, sources: [] },
    ...extras,
  };
}

const analog = (label: string): Channel[] => [
  { key: 'level', label, min: 0, max: 100, default: 0, unit: '%' },
];

export const EXPANSION: ComponentDefinition[] = [
  module(
    'passive-buzzer',
    'Passive Buzzer',
    'BUZZER',
    'A small speaker that plays the frequency you send it.',
    row(['+', '-']).map((p, i) => ({ ...p, id: i ? 'minus' : 'plus' })),
    { kind: 'speaker', a: 'plus', b: 'minus' },
    'Plays the requested frequency. Volume and tone colour are not modelled.',
    [],
    { category: 'output' },
  ),
  module(
    'water-level',
    'Water Level Sensor',
    'WATER',
    'Gives a higher voltage as more of its strip is wet.',
    row(['S', 'VCC', 'GND']),
    { kind: 'module', vcc: 'vcc', gnd: 'gnd', outputs: [{ pin: 's', channel: 'level' }] },
    'A slider sets the level. Corrosion and drift are not modelled.',
    analog('Water level'),
  ),
  module(
    'flame-sensor',
    'Flame Sensor',
    'FLAME',
    'Reports how much flame-like infrared it sees.',
    row(['AO', 'VCC', 'GND']),
    { kind: 'module', vcc: 'vcc', gnd: 'gnd', outputs: [{ pin: 'ao', channel: 'level' }] },
    'A slider sets intensity. The digital output is not modelled.',
    analog('Flame intensity'),
  ),
  module(
    'sound-sensor',
    'Sound Sensor',
    'SOUND',
    'Gives a higher voltage as sound gets louder.',
    row(['AO', 'VCC', 'GND']),
    { kind: 'module', vcc: 'vcc', gnd: 'gnd', outputs: [{ pin: 'ao', channel: 'level' }] },
    'A slider sets the level. No audio is captured.',
    analog('Sound level'),
  ),
  module(
    'joystick',
    'Joystick',
    'JOYSTICK',
    'Two analog axes. Its push button is not modelled yet.',
    row(['GND', 'VCC', 'VRX', 'VRY']),
    {
      kind: 'module',
      vcc: 'vcc',
      gnd: 'gnd',
      outputs: [
        { pin: 'vrx', channel: 'x' },
        { pin: 'vry', channel: 'y' },
      ],
    },
    'Two sliders set the axes. The button is not modelled.',
    [
      { key: 'x', label: 'X', min: 0, max: 100, default: 50 },
      { key: 'y', label: 'Y', min: 0, max: 100, default: 50 },
    ],
  ),
  module(
    'tilt-sw520d',
    'Tilt Sensor',
    'SW-520D',
    'A switch that closes when tilted upright.',
    row(['A', 'B']),
    { kind: 'switch', a: 'a', b: 'b' },
    'Hold it to tilt. Bounce is not modelled.',
    [],
    { interaction: { kind: 'press' } },
  ),
  module(
    'seven-segment',
    '7-Segment Display',
    '7-SEG',
    'Seven LEDs that form a digit. Modelled as common cathode.',
    [
      ...['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((label, i) => ({
        id: label,
        label,
        role: 'passive' as const,
        position: { x: (i - 3.5) * 13.6, y: 46 },
      })),
      { id: 'com', label: 'COM', role: 'passive' as const, position: { x: 4.5 * 13.6, y: 46 } },
    ],
    {
      kind: 'segments',
      common: 'com',
      segments: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      forwardVolts: 2,
    },
    'Common cathode only. The decimal point is not modelled.',
    [],
    { category: 'display', art: 'seven-segment' },
  ),
  module(
    'hc-sr04',
    'Ultrasonic Sensor',
    'HC-SR04',
    'Measures distance by timing an echo.',
    [
      { id: 'vcc', label: 'VCC', role: 'passive', position: { x: 84, y: 118 } },
      { id: 'trig', label: 'TRIG', role: 'passive', position: { x: 104, y: 118 } },
      { id: 'echo', label: 'ECHO', role: 'passive', position: { x: 124, y: 118 } },
      { id: 'gnd', label: 'GND', role: 'passive', position: { x: 144, y: 118 } },
    ],
    { kind: 'ranger', vcc: 'vcc', gnd: 'gnd', trig: 'trig', echo: 'echo', channel: 'cm' },
    'pulseIn returns an exact time from the slider. Trigger pulse timing is not checked.',
    [{ key: 'cm', label: 'Distance', min: 2, max: 400, default: 100, unit: 'cm' }],
    { art: 'hc-sr04' },
  ),
  module(
    'servo-sg90',
    'Servo Motor',
    'SG90',
    'Turns to a commanded angle.',
    [
      { id: 'gnd', label: 'GND', role: 'passive', position: { x: 60, y: 104 } },
      { id: 'vcc', label: 'VCC', role: 'passive', position: { x: 86, y: 104 } },
      { id: 'signal', label: 'SIG', role: 'passive', position: { x: 112, y: 104 } },
    ],
    { kind: 'servo', signal: 'signal', vcc: 'vcc', gnd: 'gnd' },
    'Models the Servo library, not its pulses. The move is instant.',
    [],
    { category: 'output', art: 'servo' },
  ),
];
