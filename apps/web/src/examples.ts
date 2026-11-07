export const EXAMPLES: { name: string; sketch: string }[] = [
  {
    name: 'Blink',
    sketch: `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
`,
  },
  {
    name: 'Button (pin 2 to GND)',
    sketch: `void setup() {
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
`,
  },
  {
    name: 'Fade (pin 9)',
    sketch: `int level = 0;
int step = 5;

void setup() {
  pinMode(9, OUTPUT);
}

void loop() {
  analogWrite(9, level);
  level += step;
  if (level <= 0 || level >= 255) {
    step = -step;
  }
  delay(30);
}
`,
  },
  {
    name: 'Read a potentiometer (A0)',
    sketch: `void setup() {
  Serial.begin(9600);
}

void loop() {
  int reading = analogRead(A0);
  Serial.println(reading);
  delay(250);
}
`,
  },
];
