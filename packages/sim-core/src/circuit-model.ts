import {
  buildNetlist,
  pinKey,
  type CircuitDocument,
  type ComponentInstance,
  type InstanceId,
} from '@pin-thirteen/circuit-core';
import type { ComponentDefinition } from '@pin-thirteen/registry';

type Lookup = { get(id: string): ComponentDefinition | undefined };

export interface PinDrive {
  mode: 'input' | 'pullup' | 'output';
  level: number;
  /** PWM duty from 0 to 1 while analogWrite is active, otherwise undefined. */
  duty?: number;
}

export interface Reach {
  volts: number;
  ohms: number;
}

interface Edge {
  a: string;
  b: string;
  ohms: number;
}

export interface DiodeState {
  instance: InstanceId;
  anode: Reach | undefined;
  cathode: Reach | undefined;
  on: boolean;
  milliamps: number;
  brightness: number;
}

const PULLUP_OHMS = 35000;
const OUTPUT_OHMS = 25;
const TYPICAL_MA = 15;

/**
 * Educational DC estimate. It follows resistive paths from each node to the nearest
 * voltage source. It does not solve general networks: see the limitation finding.
 */
export class CircuitModel {
  private readonly nodeOf: (instance: string, pin: string) => string;
  readonly edgesBase: Edge[] = [];
  private readonly gpioNodes = new Map<number, string>();
  private readonly fixed: { node: string; volts: number }[] = [];
  readonly components: { c: ComponentInstance; d: ComponentDefinition }[] = [];

  constructor(
    readonly doc: CircuitDocument,
    registry: Lookup,
  ) {
    const netlist = buildNetlist(doc, (t) => registry.get(t)?.connectivity);
    const index = new Map<string, number>();
    netlist.nets.forEach((net, i) => net.forEach((k) => index.set(k, i)));
    this.nodeOf = (instance, pin) => {
      const k = pinKey(instance, pin);
      const net = index.get(k);
      return net === undefined ? k : `net${net}`;
    };
    for (const c of doc.components) {
      const d = registry.get(c.type);
      if (!d) continue;
      this.components.push({ c, d });
      for (const pin of d.pins) {
        if (pin.gpio !== undefined) this.gpioNodes.set(pin.gpio, this.nodeOf(c.id, pin.id));
        if (pin.volts !== undefined)
          this.fixed.push({ node: this.nodeOf(c.id, pin.id), volts: pin.volts });
      }
    }
  }

  /** True when a pin touches anything else, directly or through a board. */
  isConnected(instance: string, pin: string): boolean {
    return this.nodeOf(instance, pin).startsWith('net');
  }

  node(instance: string, pin: string): string {
    return this.nodeOf(instance, pin);
  }

  gpioNode(pin: number): string | undefined {
    return this.gpioNodes.get(pin);
  }

  private edges(inputs: Inputs): { edges: Edge[]; sources: Map<string, Reach> } {
    const edges: Edge[] = [];
    const sources = new Map<string, Reach>();
    for (const { node, volts } of this.fixed) sources.set(node, { volts, ohms: 0 });
    for (const [pin, drive] of inputs.pins) {
      const node = this.gpioNodes.get(pin);
      if (node && drive.mode === 'output' && !sources.has(node)) {
        sources.set(node, { volts: drive.level ? 5 : 0, ohms: OUTPUT_OHMS });
      }
    }
    for (const { c, d } of this.components) {
      const e = d.electrical;
      if (e?.kind === 'resistor') {
        const ohms = Number(c.params[e.ohmsParam] ?? 0);
        edges.push({ a: this.nodeOf(c.id, e.a), b: this.nodeOf(c.id, e.b), ohms });
      } else if (e?.kind === 'switch' && inputs.pressed.has(c.id)) {
        edges.push({ a: this.nodeOf(c.id, e.a), b: this.nodeOf(c.id, e.b), ohms: 0 });
      }
    }
    // A divider's wiper is only known once both of its ends are.
    for (const { c, d } of this.components) {
      const e = d.electrical;
      if (e?.kind !== 'divider') continue;
      const a = reach(this.nodeOf(c.id, e.endA), edges, sources);
      const b = reach(this.nodeOf(c.id, e.endB), edges, sources);
      if (!a || !b) continue;
      const t = inputs.turned.get(c.id) ?? 0.5;
      const total = Number(c.params[e.ohmsParam] ?? 10000);
      sources.set(this.nodeOf(c.id, e.wiper), {
        volts: a.volts + (b.volts - a.volts) * t,
        ohms: total * t * (1 - t),
      });
    }
    return { edges, sources };
  }

  solve(inputs: Inputs): CircuitSolution {
    const { edges, sources } = this.edges(inputs);
    const diodes: DiodeState[] = [];
    for (const { c, d } of this.components) {
      const e = d.electrical;
      if (e?.kind !== 'diode') continue;
      const anode = reach(this.nodeOf(c.id, e.anode), edges, sources);
      const cathode = reach(this.nodeOf(c.id, e.cathode), edges, sources);
      let milliamps = 0;
      let duty = 1;
      if (anode && cathode && anode.volts - cathode.volts > e.forwardVolts) {
        const ohms = Math.max(anode.ohms + cathode.ohms, 1);
        milliamps = ((anode.volts - cathode.volts - e.forwardVolts) / ohms) * 1000;
        duty = this.dutyAt(this.nodeOf(c.id, e.anode), this.nodeOf(c.id, e.cathode), edges, inputs);
      }
      const brightness = Math.min(1, Math.sqrt(milliamps / TYPICAL_MA)) * duty;
      diodes.push({ instance: c.id, anode, cathode, on: milliamps > 0, milliamps, brightness });
    }
    return {
      diodes,
      voltageAt: (node) => reach(node, edges, sources),
    };
  }

  private dutyAt(anode: string, cathode: string, edges: Edge[], inputs: Inputs): number {
    let duty = 1;
    for (const [pin, drive] of inputs.pins) {
      const node = this.gpioNodes.get(pin);
      if (!node || drive.duty === undefined) continue;
      if (joined(node, anode, edges)) duty = Math.min(duty, drive.duty);
      if (joined(node, cathode, edges)) duty = Math.min(duty, 1 - drive.duty);
    }
    return duty;
  }

  /** Voltage seen by an input pin, or undefined when it is floating. */
  readPin(pin: number, solution: CircuitSolution, drive: PinDrive | undefined): number | undefined {
    const node = this.gpioNodes.get(pin);
    const seen = node ? solution.voltageAt(node) : undefined;
    if (drive?.mode === 'pullup') {
      if (!seen) return 5;
      // The internal pull-up forms a divider with whatever pulls the pin.
      return seen.volts + ((5 - seen.volts) * seen.ohms) / (seen.ohms + PULLUP_OHMS);
    }
    return seen?.volts;
  }
}

export interface Inputs {
  pins: Map<number, PinDrive>;
  pressed: Set<InstanceId>;
  turned: Map<InstanceId, number>;
}

export interface CircuitSolution {
  diodes: DiodeState[];
  voltageAt(node: string): Reach | undefined;
}

function joined(from: string, to: string, edges: Edge[]): boolean {
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const n = queue.pop()!;
    if (n === to) return true;
    for (const e of edges) {
      const next = e.a === n ? e.b : e.b === n ? e.a : undefined;
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

/** Lowest-resistance path from a node to any source. */
function reach(start: string, edges: Edge[], sources: Map<string, Reach>): Reach | undefined {
  const best = new Map<string, number>([[start, 0]]);
  const pending = [start];
  let found: Reach | undefined;
  while (pending.length) {
    pending.sort((a, b) => best.get(a)! - best.get(b)!);
    const n = pending.shift()!;
    const r = best.get(n)!;
    const source = sources.get(n);
    if (source) {
      const ohms = r + source.ohms;
      if (!found || ohms < found.ohms) found = { volts: source.volts, ohms };
      continue;
    }
    for (const e of edges) {
      const next = e.a === n ? e.b : e.b === n ? e.a : undefined;
      if (!next) continue;
      const total = r + e.ohms;
      if (total < (best.get(next) ?? Infinity)) {
        best.set(next, total);
        pending.push(next);
      }
    }
  }
  return found;
}
