// Regenerates expected output from real avr-gcc plus avr8js. Needs the Arduino IDE and
// `npm i avr8js` beside this script. Outputs are committed, so CI needs neither.
// Usage: node generate-goldens.cjs <path-to-arduino-cli>
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { CPU, avrInstruction, AVRTimer, timer0Config, AVRUSART, usart0Config } = require('avr8js');

function load(file) {
  const m = new Uint8Array(0x8000);
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
    if (l[0] !== ':' || l.slice(7, 9) !== '00') continue;
    const n = parseInt(l.slice(1, 3), 16);
    const a = parseInt(l.slice(3, 7), 16);
    for (let i = 0; i < n; i++) m[a + i] = parseInt(l.slice(9 + i * 2, 11 + i * 2), 16);
  }
  return new Uint16Array(m.buffer);
}

const root = path.join(__dirname, '..', 'sketches');
for (const name of fs.readdirSync(root)) {
  const dir = path.join(root, name);
  const out = path.join(dir, 'build');
  execFileSync(
    process.argv[2],
    ['compile', '--fqbn', 'arduino:avr:uno', '--output-dir', out, dir],
    { stdio: 'pipe' },
  );
  const cpu = new CPU(load(path.join(out, `${name}.ino.hex`)));
  new AVRTimer(cpu, timer0Config);
  const usart = new AVRUSART(cpu, usart0Config, 16e6);
  let text = '';
  usart.onByteTransmit = (c) => (text += String.fromCharCode(c));
  while (cpu.cycles < 2 * 16e6) {
    avrInstruction(cpu);
    cpu.tick();
  }
  fs.writeFileSync(path.join(dir, 'expected.txt'), text);
  fs.rmSync(out, { recursive: true });
  console.log(name, text.length);
}
