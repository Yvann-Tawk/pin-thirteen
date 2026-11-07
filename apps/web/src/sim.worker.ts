import { registry } from '@pin-thirteen/registry';
import { AvrEngine, compileWithGcc, type LoadTool } from '@pin-thirteen/sim-avr';
import type { SimulationEngine } from '@pin-thirteen/sim-core';
import { compile, EducationalEngine } from '@pin-thirteen/sim-edu';
import type { WorkerRequest, WorkerResponse } from './sim-protocol';

let engine: SimulationEngine<never> | null = null;
const post = (message: WorkerResponse) => postMessage(message);
const TICK_MS = 16;
const MAX_STEP_MICROS = 50_000;

let last = performance.now();
let serial = '';
let frames = 0;

function tick() {
  if (!engine) return;
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
      const started = performance.now();
      let run: SimulationEngine<never>;
      if (data.engine === 'avr') {
        const load: LoadTool = async (name, options) => {
          const tool = await import(/* @vite-ignore */ `${data.toolchain}${name}.mjs`);
          return tool.default({ ...options, locateFile: (file: string) => data.toolchain + file });
        };
        const bundle = await (await fetch(`${data.toolchain}bundle.json`)).json();
        const built = await compileWithGcc(data.sketch, bundle, load);
        if (!built.ok) {
          const first = built.errors[0]!;
          post({ type: 'compile-error', line: first.line, message: first.message });
          return;
        }
        const avr = new AvrEngine(registry);
        await avr.initialize(data.circuit);
        await avr.loadProgram(built.hex);
        run = avr as unknown as SimulationEngine<never>;
      } else {
        const result = compile(data.sketch);
        if (!result.ok) return;
        const edu = new EducationalEngine(registry);
        await edu.initialize(data.circuit);
        await edu.loadProgram(result.program);
        run = edu as unknown as SimulationEngine<never>;
      }
      post({ type: 'compiled', milliseconds: Math.round(performance.now() - started) });
      run.subscribe((event) => {
        if (event.type === 'serial') serial += event.text;
      });
      await run.start();
      for (const input of data.inputs) run.sendInput(input);
      engine = run;
      last = performance.now();
      setInterval(tick, TICK_MS);
      break;
    }
    case 'circuit':
      engine?.updateCircuit(data.circuit);
      break;
    case 'input':
      engine?.sendInput(data.input);
      break;
    case 'serial':
      engine?.writeSerial(data.text);
      break;
  }
};
