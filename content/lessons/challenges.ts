import type { Check, Lesson, StepKind } from '../../packages/learning/src/index';

const KINDS: StepKind[] = [
  'introduction',
  'theory',
  'components',
  'assembly',
  'programming',
  'experiment',
  'verification',
  'recap',
];

function challenge(
  id: string,
  number: number,
  title: string,
  brief: string,
  hint: string,
  parts: string[],
  verify: Check[],
): Lesson {
  const body: Record<StepKind, [string, string]> = {
    introduction: ['The challenge', brief],
    theory: ['Think first', 'Plan your inputs, decisions and outputs before you wire anything.'],
    components: ['Parts', 'These are the parts you will need.'],
    assembly: [
      'Build it',
      'There are no wiring steps here. Use the checks beside the code to guide you.',
    ],
    programming: ['Code it', 'Write your own sketch. The Library explains each function.'],
    experiment: ['Stuck?', hint],
    verification: [
      'Check your work',
      'The checks read your actual circuit, sketch and simulation.',
    ],
    recap: ['Well done', 'You solved this one without step-by-step help.'],
  };
  return {
    id,
    number,
    title,
    summary: brief,
    mode: 'build-code',
    parts,
    support: 'approximate',
    steps: KINDS.map((kind) => ({ kind, title: body[kind][0], body: [body[kind][1]] })),
    verify,
  };
}

export const CHALLENGES: Lesson[] = [
  challenge(
    'challenge-sos',
    101,
    'Morse code',
    'Make an LED on pin 12 flash in a pattern of your own.',
    'Pin 12 needs the same circuit as pin 13. Use delay() between flashes.',
    ['uno-r3', 'resistor', 'led-5mm'],
    [
      { type: 'circuit.ledCanLight', gpio: 12, label: 'Pin 12 can light the LED' },
      {
        type: 'sim.ledBlinked',
        minTransitions: 8,
        label: 'The LED has flashed at least four times',
      },
    ],
  ),
  challenge(
    'challenge-dimmer',
    102,
    'Knob-controlled dimmer',
    'Set LED brightness with a potentiometer.',
    'Read A0, then use map() to turn 0 to 1023 into 0 to 255 for analogWrite.',
    ['uno-r3', 'potentiometer', 'resistor', 'led-5mm'],
    [
      {
        type: 'circuit.pinTouches',
        gpio: 14,
        part: 'potentiometer',
        label: 'A0 reaches the potentiometer',
      },
      { type: 'sketch.calls', name: 'analogRead', label: 'The sketch reads the knob' },
      { type: 'sketch.calls', name: 'analogWrite', label: 'The sketch dims the LED' },
      { type: 'sim.ledDimmed', label: 'The LED has shown several brightness levels' },
    ],
  ),
  challenge(
    'challenge-alarm',
    103,
    'Water alarm',
    'Sound a buzzer when the water level rises.',
    'Compare analogRead with a threshold in an if statement, then call tone() or noTone().',
    ['uno-r3', 'water-level', 'passive-buzzer'],
    [
      {
        type: 'circuit.pinTouches',
        gpio: 14,
        part: 'water-level',
        label: 'A0 reaches the water sensor',
      },
      { type: 'sketch.calls', name: 'noTone', label: 'The sketch can silence the alarm' },
      { type: 'sim.partReported', part: 'Hz', label: 'The alarm has sounded' },
    ],
  ),
  challenge(
    'challenge-gauge',
    104,
    'Distance gauge',
    'Point a servo at an angle that matches a measured distance.',
    'Turn the distance into an angle with map(), then write it to the servo.',
    ['uno-r3', 'hc-sr04', 'servo-sg90'],
    [
      { type: 'sketch.calls', name: 'pulseIn', label: 'The sketch measures distance' },
      { type: 'sim.partReported', part: '°', label: 'The servo has moved' },
    ],
  ),
];

export const BADGES: { id: string; title: string; requires: string[] }[] = [
  { id: 'first-light', title: 'First Light', requires: ['first-led', 'blink'] },
  { id: 'good-listener', title: 'Good Listener', requires: ['push-button', 'potentiometer'] },
  {
    id: 'full-issue',
    title: 'Full Issue',
    requires: ['sound', 'sensors', 'motors', 'displays', 'combining'],
  },
  { id: 'solo-artist', title: 'Solo Artist', requires: CHALLENGES.map((c) => c.id) },
];
