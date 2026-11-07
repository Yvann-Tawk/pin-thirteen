import type { Lesson, LessonStep, StepKind } from '../../packages/learning/src/index';

const step = (kind: StepKind, title: string, ...body: string[]): LessonStep => ({
  kind,
  title,
  body,
});

const LED_ASSEMBLY = step(
  'assembly',
  'Wire the circuit',
  'Place an LED and a resistor. Set the resistor to 220 Ω in the inspector.',
  'Wire pin D13 to one end of the resistor, then the other end of the resistor to the LED long leg (+).',
  'Wire the LED short leg (-) to a GND pin. Current now has a full loop to travel.',
);

const BLINK = `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`;

const BUTTON = `void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(13, OUTPUT);
}

void loop() {
  if (digitalRead(2) == LOW) {
    digitalWrite(13, HIGH);
  } else {
    digitalWrite(13, LOW);
  }
}
`;

const POT = `void setup() {
  Serial.begin(9600);
}

void loop() {
  int reading = analogRead(A0);
  Serial.println(reading);
  delay(200);
}
`;

const POT_VOLTS = `void setup() {
  Serial.begin(9600);
}

void loop() {
  int reading = analogRead(A0);
  float volts = reading * 5.0 / 1023.0;
  Serial.println(volts);
  delay(200);
}
`;

const FADE = `int level = 0;
int change = 5;

void setup() {
  pinMode(9, OUTPUT);
}

void loop() {
  analogWrite(9, level);
  level = level + change;
  if (level <= 0 || level >= 255) {
    change = -change;
  }
  delay(30);
}
`;

const TONE = `void setup() {
  pinMode(8, OUTPUT);
}

void loop() {
  tone(8, 440);
  delay(500);
  tone(8, 660);
  delay(500);
}
`;

const RANGE = `void setup() {
  pinMode(6, OUTPUT);
  pinMode(7, INPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(6, HIGH);
  delayMicroseconds(10);
  digitalWrite(6, LOW);
  long echo = pulseIn(7, HIGH);
  Serial.println(echo / 58);
  delay(300);
}
`;

const SWEEP = `#include <Servo.h>

Servo arm;

void setup() {
  arm.attach(9);
}

void loop() {
  arm.write(30);
  delay(800);
  arm.write(150);
  delay(800);
}
`;

const DIGIT = `void setup() {
  pinMode(3, OUTPUT);
  pinMode(4, OUTPUT);
}

void loop() {
  digitalWrite(3, HIGH);
  digitalWrite(4, HIGH);
}
`;

const DOORBELL = `void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(8, OUTPUT);
}

void loop() {
  if (digitalRead(2) == LOW) {
    tone(8, 880);
  } else {
    noTone(8);
  }
}
`;

const theory = (
  id: string,
  number: number,
  title: string,
  summary: string,
  parts: string[],
  intro: string,
  theoryText: string[],
  components: string,
  explore: string,
  recap: string,
): Lesson => ({
  id,
  number,
  title,
  summary,
  mode: 'theory',
  parts,
  support: 'full',
  steps: [
    step('introduction', 'Start here', intro),
    step('theory', 'The idea', ...theoryText),
    step('components', 'What you will look at', components),
    step(
      'assembly',
      'Nothing to wire yet',
      'This lesson is about understanding. The wiring comes soon.',
    ),
    step('programming', 'No code yet', 'Code arrives once the hardware makes sense.'),
    step('experiment', 'Explore', explore),
    step('verification', 'Check your work', 'Place the parts listed below on the workspace.'),
    step('recap', 'What you learned', recap),
  ],
  verify: parts.map((part) => ({
    type: 'circuit.hasPart',
    part,
    label: `Place the ${part.replace(/-/g, ' ')}`,
  })),
});

export const LESSONS: Lesson[] = [
  theory(
    'intro-to-arduino',
    1,
    'Introduction to Arduino',
    'What a microcontroller is, and what a sketch does.',
    ['uno-r3'],
    'An Arduino-compatible board is a tiny computer that does one job, over and over, and can sense and control the real world.',
    [
      'A desktop computer runs many programs. A microcontroller runs a single program, called a sketch, from the moment it gets power.',
      'Every sketch has two parts: setup() runs once at the start, and loop() repeats forever.',
    ],
    'You need one UNO R3 board.',
    'Click the board on the workspace and read about it in the inspector.',
    'A microcontroller runs one sketch. setup() runs once. loop() never stops.',
  ),
  theory(
    'understanding-uno',
    2,
    'Understanding the UNO R3',
    'Pins, power, and ground.',
    ['uno-r3'],
    'The rows of pins are how the board talks to the outside world.',
    [
      'Digital pins 0 to 13 are either HIGH (5 V) or LOW (0 V).',
      'Analog pins A0 to A5 can measure a voltage between 0 and 5 V.',
      'The power pins provide 5 V and 3.3 V. GND is ground, the return path every circuit needs.',
      'Pins marked 3, 5, 6, 9, 10 and 11 can fake in-between levels with PWM.',
    ],
    'You need one UNO R3 board.',
    'Hover over the pins on the board. The label shows each pin name.',
    'Digital pins are on or off. Analog pins measure. GND completes every circuit.',
  ),
  theory(
    'electricity',
    3,
    'Electricity fundamentals',
    'Voltage, current, resistance, and polarity.',
    ['resistor', 'led-5mm'],
    'Three words explain almost every circuit: voltage, current and resistance.',
    [
      'Voltage is the push. It is measured in volts, between two points.',
      'Current is the flow, measured in amps. It only flows around a complete loop.',
      'Resistance slows the flow, measured in ohms.',
      'Ohm’s law joins them: voltage = current × resistance.',
      'Some parts have polarity, so they only work one way round. An LED is one of them.',
    ],
    'You need a resistor and an LED.',
    'Select the resistor and change its value in the inspector. A larger value means less current.',
    'Voltage pushes, current flows, resistance limits. Current needs a complete loop.',
  ),
  {
    id: 'breadboard-basics',
    number: 4,
    title: 'Breadboard basics',
    summary: 'How holes connect without solder.',
    mode: 'build',
    parts: ['breadboard-830', 'resistor'],
    support: 'full',
    steps: [
      step(
        'introduction',
        'Start here',
        'A breadboard lets you build circuits by pushing parts into holes.',
      ),
      step(
        'theory',
        'The idea',
        'Inside, metal strips join holes. Each column joins rows a to e, and separately rows f to j.',
        'The groove down the middle separates the two halves.',
        'The long rails along the edges carry power and ground the length of the board.',
      ),
      step('components', 'What you need', 'A breadboard and a resistor.'),
      step(
        'assembly',
        'Try it',
        'Drag a resistor onto the board so both legs land in holes. Then hover over a hole: everything joined to it lights up.',
      ),
      step('programming', 'No code yet', 'This lesson is all about connections.'),
      step(
        'experiment',
        'Explore',
        'Hover a rail hole, then a hole in the middle. Compare what lights up.',
      ),
      step(
        'verification',
        'Check your work',
        'Have a resistor on the workspace, with the breadboard present.',
      ),
      step(
        'recap',
        'What you learned',
        'Columns connect across five holes. The groove splits them. Rails run the full length.',
      ),
    ],
    verify: [
      { type: 'circuit.hasPart', part: 'breadboard-830', label: 'Have a breadboard' },
      { type: 'circuit.hasPart', part: 'resistor', label: 'Place a resistor' },
    ],
  },
  {
    id: 'first-led',
    number: 5,
    title: 'Your first LED circuit',
    summary: 'Make a complete, safe loop.',
    mode: 'build',
    parts: ['uno-r3', 'resistor', 'led-5mm'],
    support: 'approximate',
    steps: [
      step(
        'introduction',
        'Start here',
        'You will light an LED and learn why it needs a resistor.',
      ),
      step(
        'theory',
        'The idea',
        'An LED has a long leg (+, anode) and a short leg (-, cathode). Current must go in the long leg.',
        'Without a resistor, too much current could damage the LED or the board.',
      ),
      step('components', 'What you need', 'A board, an LED, and a resistor of about 220 Ω.'),
      LED_ASSEMBLY,
      step(
        'programming',
        'No code yet',
        'The next lesson makes it blink. Here we check the wiring.',
      ),
      step(
        'experiment',
        'Explore',
        'Swap the LED legs on purpose and read the warning. Then put them back.',
      ),
      step('verification', 'Check your work', 'The checks read your actual circuit.'),
      step(
        'recap',
        'What you learned',
        'LEDs have polarity, need a resistor, and need a path back to ground.',
      ),
    ],
    verify: [
      { type: 'circuit.hasPart', part: 'led-5mm', label: 'Place an LED' },
      { type: 'circuit.hasPart', part: 'resistor', label: 'Place a resistor' },
      { type: 'circuit.noErrors', label: 'No wiring errors' },
      { type: 'circuit.ledCanLight', gpio: 13, label: 'Pin 13 can light the LED' },
    ],
  },
  {
    id: 'blink',
    number: 6,
    title: 'Blinking an LED',
    summary: 'Your first sketch.',
    mode: 'build-code',
    parts: ['uno-r3', 'resistor', 'led-5mm'],
    support: 'approximate',
    sketch: BLINK,
    steps: [
      step(
        'introduction',
        'Start here',
        'Pin 13 is where the classic first sketch happens: an LED that blinks.',
      ),
      step(
        'theory',
        'The idea',
        'pinMode() sets a pin as an output. digitalWrite() turns it HIGH or LOW. delay() waits, in milliseconds.',
      ),
      step('components', 'What you need', 'The same circuit as the last lesson.'),
      LED_ASSEMBLY,
      step(
        'programming',
        'Write the sketch',
        'Load the sketch into the Code Lab, then read each line.',
        'setup() prepares pin 13. loop() turns it on, waits, turns it off, and waits again.',
      ),
      step(
        'experiment',
        'Explore',
        'Press Run. Then Stop, change both delays to 200, and Run again.',
      ),
      step('verification', 'Check your work', 'Run the sketch and let the LED blink a few times.'),
      step(
        'recap',
        'What you learned',
        'You set a pin as an output, switched it, and timed it with delay().',
      ),
    ],
    verify: [
      { type: 'circuit.noErrors', label: 'No wiring errors' },
      { type: 'circuit.ledCanLight', gpio: 13, label: 'Pin 13 can light the LED' },
      { type: 'sketch.calls', name: 'digitalWrite', label: 'The sketch uses digitalWrite' },
      { type: 'sim.ledBlinked', minTransitions: 3, label: 'The LED has blinked on the simulator' },
    ],
  },
  {
    id: 'resistors',
    number: 7,
    title: 'Understanding resistors',
    summary: 'Ohm’s law in action.',
    mode: 'build-code',
    parts: ['uno-r3', 'resistor', 'led-5mm'],
    support: 'approximate',
    sketch: BLINK,
    steps: [
      step('introduction', 'Start here', 'The resistor value decides how much current flows.'),
      step(
        'theory',
        'The idea',
        'Current = (supply voltage - LED voltage) / resistance.',
        'With 5 V, about 2 V for the LED, and 220 Ω, that is about 14 mA.',
      ),
      step('components', 'What you need', 'Your LED circuit.'),
      LED_ASSEMBLY,
      step('programming', 'Use the Blink sketch', 'Load it into the Code Lab.'),
      step(
        'experiment',
        'Explore',
        'While it runs, change the resistor to 1000 and watch the LED dim. Try 100 too.',
        'The simulator estimates this. Real LEDs vary.',
      ),
      step('verification', 'Check your work', 'Keep the circuit free of errors, and run it.'),
      step('recap', 'What you learned', 'More resistance means less current and a dimmer LED.'),
    ],
    verify: [
      { type: 'circuit.noErrors', label: 'No wiring errors' },
      { type: 'circuit.ledCanLight', gpio: 13, label: 'Pin 13 can light the LED' },
      { type: 'sim.ledBlinked', minTransitions: 1, label: 'The LED has changed on the simulator' },
    ],
  },
  {
    id: 'push-button',
    number: 8,
    title: 'Reading a push button',
    summary: 'Inputs, decisions, and floating pins.',
    mode: 'build-code',
    parts: ['uno-r3', 'push-button', 'resistor', 'led-5mm'],
    support: 'full',
    sketch: BUTTON,
    steps: [
      step('introduction', 'Start here', 'So far the board has only talked. Now it listens.'),
      step(
        'theory',
        'The idea',
        'digitalRead() returns HIGH or LOW. An unconnected input floats and reads randomly.',
        'INPUT_PULLUP holds a pin HIGH, so a button to GND reads LOW when pressed.',
        'if and else let the sketch decide.',
      ),
      step('components', 'What you need', 'Your LED circuit, plus a push button.'),
      step(
        'assembly',
        'Wire the button',
        'Keep your LED circuit on pin 13.',
        'Wire D2 to side A of the button (a1), and side B (b1) to GND.',
      ),
      step('programming', 'Write the sketch', 'Load it into the Code Lab.'),
      step(
        'experiment',
        'Explore',
        'Press Run, then hold the button with your pointer. Remove the pull-up from the sketch to see a floating warning.',
      ),
      step('verification', 'Check your work', 'Run the sketch and press the button a few times.'),
      step(
        'recap',
        'What you learned',
        'Inputs need a defined level. if lets your sketch respond.',
      ),
    ],
    verify: [
      { type: 'circuit.pinTouches', gpio: 2, part: 'push-button', label: 'D2 reaches the button' },
      { type: 'sketch.calls', name: 'digitalRead', label: 'The sketch uses digitalRead' },
      { type: 'sim.ledBlinked', minTransitions: 2, label: 'The button has switched the LED' },
    ],
  },
  {
    id: 'potentiometer',
    number: 9,
    title: 'Using a potentiometer',
    summary: 'A knob your sketch can read.',
    mode: 'build-code',
    parts: ['uno-r3', 'potentiometer'],
    support: 'approximate',
    sketch: POT,
    steps: [
      step('introduction', 'Start here', 'A potentiometer turns a position into a voltage.'),
      step(
        'theory',
        'The idea',
        'Its two ends connect to 5 V and GND. The middle pin slides between them, so its voltage changes as you turn.',
        'Variables, such as int reading, store a value to use later.',
      ),
      step('components', 'What you need', 'A board and a potentiometer.'),
      step(
        'assembly',
        'Wire it',
        'Wire one end pin to 5V, the other end to GND, and the middle pin (wiper) to A0.',
      ),
      step('programming', 'Write the sketch', 'Load it into the Code Lab.'),
      step(
        'experiment',
        'Explore',
        'Run it, open Serial Monitor, select the potentiometer, and drag its Position slider.',
      ),
      step(
        'verification',
        'Check your work',
        'Run the sketch and turn the knob so at least two readings appear.',
      ),
      step(
        'recap',
        'What you learned',
        'A potentiometer is a voltage divider. Variables hold readings.',
      ),
    ],
    verify: [
      {
        type: 'circuit.pinTouches',
        gpio: 14,
        part: 'potentiometer',
        label: 'A0 reaches the potentiometer',
      },
      { type: 'sketch.calls', name: 'analogRead', label: 'The sketch uses analogRead' },
      { type: 'sim.serialVaried', label: 'Readings have changed in Serial Monitor' },
    ],
  },
  {
    id: 'analog-inputs',
    number: 10,
    title: 'Understanding analog inputs',
    summary: 'From voltage to numbers.',
    mode: 'build-code',
    parts: ['uno-r3', 'potentiometer'],
    support: 'approximate',
    sketch: POT_VOLTS,
    steps: [
      step('introduction', 'Start here', 'analogRead gives a number. What does it mean?'),
      step(
        'theory',
        'The idea',
        'The UNO measures 0 to 5 V as a whole number from 0 to 1023. That is 10-bit resolution.',
        'To get volts back: reading × 5.0 / 1023.0.',
        'Using 5.0 rather than 5 keeps the decimals, because whole-number division throws them away.',
      ),
      step('components', 'What you need', 'Your potentiometer circuit.'),
      step('assembly', 'Same wiring', 'Keep the circuit from the last lesson.'),
      step('programming', 'Write the sketch', 'Load it. It converts the reading into volts.'),
      step(
        'experiment',
        'Explore',
        'Change 5.0 to 5, Run, and compare what happens to the decimals. Then change it back.',
      ),
      step(
        'verification',
        'Check your work',
        'Run it and move the knob so at least two values appear.',
      ),
      step(
        'recap',
        'What you learned',
        'Analog readings run from 0 to 1023. Convert them with a bit of maths.',
      ),
    ],
    verify: [
      {
        type: 'circuit.pinTouches',
        gpio: 14,
        part: 'potentiometer',
        label: 'A0 reaches the potentiometer',
      },
      { type: 'sim.serialVaried', label: 'Values have changed in Serial Monitor' },
    ],
  },
  {
    id: 'pwm',
    number: 11,
    title: 'PWM and brightness',
    summary: 'Faking in-between levels.',
    mode: 'build-code',
    parts: ['uno-r3', 'resistor', 'led-5mm'],
    support: 'approximate',
    sketch: FADE,
    steps: [
      step(
        'introduction',
        'Start here',
        'Digital pins are only on or off. So how can an LED fade?',
      ),
      step(
        'theory',
        'The idea',
        'PWM switches a pin very fast. The share of time it is on is the duty cycle.',
        'analogWrite(pin, value) takes 0 to 255, on pins 3, 5, 6, 9, 10 and 11 only.',
        'The simulator shows the average brightness, not the fast switching.',
      ),
      step('components', 'What you need', 'Your LED circuit, moved to pin 9.'),
      step(
        'assembly',
        'Move one wire',
        'Remove the wire on D13 and connect the resistor to D9 instead.',
      ),
      step(
        'programming',
        'Write the sketch',
        'Load it. The value climbs, then reverses at each end.',
      ),
      step('experiment', 'Explore', 'Change the 5 or the 30, and see how the fade changes speed.'),
      step(
        'verification',
        'Check your work',
        'Run it until the LED has shown several brightness levels.',
      ),
      step('recap', 'What you learned', 'PWM approximates a level by switching fast.'),
    ],
    verify: [
      { type: 'circuit.ledCanLight', gpio: 9, label: 'Pin 9 can light the LED' },
      { type: 'sketch.calls', name: 'analogWrite', label: 'The sketch uses analogWrite' },
      { type: 'sim.ledDimmed', label: 'The LED has shown several brightness levels' },
    ],
  },
  {
    id: 'sound',
    number: 12,
    title: 'Generating sound with a buzzer',
    summary: 'Frequency, tone and loops.',
    mode: 'build-code',
    parts: ['uno-r3', 'passive-buzzer'],
    support: 'approximate',
    sketch: TONE,
    steps: [
      step(
        'introduction',
        'Start here',
        'Sound is air moving back and forth. Your sketch can make that happen.',
      ),
      step(
        'theory',
        'The idea',
        'Frequency is how fast something repeats, in hertz. Higher frequency means a higher note.',
        'tone(pin, frequency) plays a note. noTone(pin) stops it.',
      ),
      step('components', 'What you need', 'A board and a passive buzzer.'),
      step('assembly', 'Wire it', 'Wire D8 to the buzzer plus pin, and the minus pin to GND.'),
      step('programming', 'Write the sketch', 'Load it. A for loop could play a scale later.'),
      step(
        'experiment',
        'Explore',
        'Press Run, and change the frequencies. Your browser plays the tone at the simulated pitch.',
      ),
      step('verification', 'Check your work', 'Run the sketch.'),
      step('recap', 'What you learned', 'Frequency sets pitch. tone() drives a buzzer from a pin.'),
    ],
    verify: [
      {
        type: 'circuit.pinTouches',
        gpio: 8,
        part: 'passive-buzzer',
        label: 'D8 reaches the buzzer',
      },
      { type: 'sketch.calls', name: 'tone', label: 'The sketch uses tone' },
      { type: 'sim.partReported', part: 'Hz', label: 'The buzzer has played a tone' },
    ],
  },
  {
    id: 'sensors',
    number: 13,
    title: 'Working with sensors',
    summary: 'Measure distance with echoes.',
    mode: 'build-code',
    parts: ['uno-r3', 'hc-sr04'],
    support: 'approximate',
    sketch: RANGE,
    steps: [
      step('introduction', 'Start here', 'Sensors turn the world into numbers.'),
      step(
        'theory',
        'The idea',
        'The HC-SR04 sends a pulse of sound, and reports how long the echo took.',
        'Sound takes about 58 microseconds to travel a centimetre there and back.',
      ),
      step('components', 'What you need', 'A board and an ultrasonic sensor.'),
      step('assembly', 'Wire it', 'VCC to 5V, GND to GND, TRIG to D6, and ECHO to D7.'),
      step('programming', 'Write the sketch', 'Load it. pulseIn measures the echo.'),
      step(
        'experiment',
        'Explore',
        'Run it, open Serial Monitor, select the sensor, and move its distance slider.',
        'The simulator gives an exact answer. Real sensors are noisier.',
      ),
      step('verification', 'Check your work', 'Run it and change the distance.'),
      step('recap', 'What you learned', 'Sensors need power, signals, and a little maths.'),
    ],
    verify: [
      { type: 'circuit.pinTouches', gpio: 7, part: 'hc-sr04', label: 'D7 reaches the sensor' },
      { type: 'sketch.calls', name: 'pulseIn', label: 'The sketch uses pulseIn' },
      { type: 'sim.serialVaried', label: 'Distances have changed in Serial Monitor' },
    ],
  },
  {
    id: 'motors',
    number: 14,
    title: 'Controlling motors',
    summary: 'Move a servo to an angle.',
    mode: 'build-code',
    parts: ['uno-r3', 'servo-sg90'],
    support: 'approximate',
    sketch: SWEEP,
    steps: [
      step('introduction', 'Start here', 'Now your sketch can move something.'),
      step(
        'theory',
        'The idea',
        'A servo turns to the angle you ask for.',
        'A library is ready-made code. #include brings it in.',
        'Real motors draw more current than a pin can give, so they get their own power.',
      ),
      step('components', 'What you need', 'A board and an SG90 servo.'),
      step('assembly', 'Wire it', 'Signal to D9, VCC to 5V, GND to GND.'),
      step(
        'programming',
        'Write the sketch',
        'Load it. This simulator models the Servo library, not the pulses.',
      ),
      step('experiment', 'Explore', 'Change the angles, and watch the reading beside the servo.'),
      step('verification', 'Check your work', 'Run the sketch.'),
      step(
        'recap',
        'What you learned',
        'Libraries add abilities. A servo moves to a commanded angle.',
      ),
    ],
    verify: [
      { type: 'circuit.pinTouches', gpio: 9, part: 'servo-sg90', label: 'D9 reaches the servo' },
      { type: 'sim.partReported', part: '°', label: 'The servo has moved' },
    ],
  },
  {
    id: 'displays',
    number: 15,
    title: 'Displaying information',
    summary: 'Light a 7-segment digit.',
    mode: 'build-code',
    parts: ['uno-r3', 'seven-segment', 'resistor'],
    support: 'approximate',
    sketch: DIGIT,
    steps: [
      step('introduction', 'Start here', 'Seven LEDs can draw every digit.'),
      step(
        'theory',
        'The idea',
        'Each segment is an LED with its own pin, and all of them share one common pin.',
        'Arrays hold a list of pins, so a loop can set them all.',
      ),
      step('components', 'What you need', 'A board, a display, and a resistor.'),
      step(
        'assembly',
        'Wire it',
        'Wire common through a resistor to GND. Wire segments a to g to D2 to D8.',
      ),
      step(
        'programming',
        'Write the sketch',
        'Load it. It shows the digit 1, using segments b and c.',
      ),
      step('experiment', 'Explore', 'Change which pins go HIGH to draw a different digit.'),
      step('verification', 'Check your work', 'Run the sketch.'),
      step('recap', 'What you learned', 'Displays are many outputs working together.'),
    ],
    verify: [
      { type: 'circuit.pinTouches', gpio: 3, part: 'seven-segment', label: 'D3 reaches segment b' },
      { type: 'sim.segmentsLit', label: 'Segments have lit' },
    ],
  },
  {
    id: 'combining',
    number: 16,
    title: 'Combining multiple components',
    summary: 'A button that plays a note.',
    mode: 'build-code',
    parts: ['uno-r3', 'push-button', 'passive-buzzer'],
    support: 'approximate',
    sketch: DOORBELL,
    steps: [
      step('introduction', 'Start here', 'Real projects combine inputs and outputs.'),
      step(
        'theory',
        'The idea',
        'Plan first: what is the input, what is the decision, and what is the output?',
        'Build one part at a time, and test as you go.',
      ),
      step('components', 'What you need', 'A board, a button, and a buzzer.'),
      step(
        'assembly',
        'Wire it',
        'Button side A to D2, side B to GND. Buzzer plus to D8, minus to GND.',
      ),
      step('programming', 'Write the sketch', 'Load it. Read each line, and name its job.'),
      step('experiment', 'Explore', 'Change the note. Try adding an LED.'),
      step('verification', 'Check your work', 'Run it, and press the button.'),
      step('recap', 'What you learned', 'Input, decide, output: most projects are this loop.'),
    ],
    verify: [
      { type: 'circuit.pinTouches', gpio: 2, part: 'push-button', label: 'D2 reaches the button' },
      {
        type: 'circuit.pinTouches',
        gpio: 8,
        part: 'passive-buzzer',
        label: 'D8 reaches the buzzer',
      },
      { type: 'sim.partReported', part: 'Hz', label: 'The doorbell has rung' },
    ],
  },
];
