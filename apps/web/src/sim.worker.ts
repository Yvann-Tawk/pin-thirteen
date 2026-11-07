import { registry } from '@pin-thirteen/registry';
import { compile, EducationalEngine } from '@pin-thirteen/sim-edu';
import type { WorkerRequest, WorkerResponse } from './sim-protocol';

const engine = new EducationalEngine(registry);
const post = (message: WorkerResponse) => postMessage(message);
const TICK_MS = 16;
const MAX_STEP_MICROS = 50_000;

let last = performance.now();
let serial = '';
let frames = 0;
engine.subscribe((event) => {
  if (event.type === 'serial') serial += event.text;
});

function tick() {
  const now = performance.now();
  engine.advance(Math.min((now - last) * 1000, MAX_STEP_MICROS));
  last = now;
  frames += 1;
  if (frames % 2 === 0) {
    post({ type: 'state', state: engine.getState(), serial });
    serial = '';
  }
}

onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  switch (data.type) {
    case 'start': {
      const result = compile(data.sketch);
      if (!result.ok) return;
      await engine.initialize(data.circuit);
      await engine.loadProgram(result.program);
      await engine.start();
      for (const input of data.inputs) engine.sendInput(input);
      last = performance.now();
      setInterval(tick, TICK_MS);
      break;
    }
    case 'circuit':
      engine.updateCircuit(data.circuit);
      break;
    case 'input':
      engine.sendInput(data.input);
      break;
    case 'serial':
      engine.writeSerial(data.text);
      break;
  }
};
