import type { CircuitDocument } from '@pin-thirteen/circuit-core';
import type { ComponentDefinition } from '@pin-thirteen/registry';
import { CircuitModel, type Inputs } from '@pin-thirteen/sim-core';

export type Severity = 'error' | 'hazard' | 'limitation';

export interface Finding {
  id: string;
  severity: Severity;
  message: string;
  instance?: string;
}

type Lookup = { get(id: string): ComponentDefinition | undefined };

export const MODEL_LIMITATION: Finding = {
  id: 'model-simplified',
  severity: 'limitation',
  message: 'This is a simplified model. A passing check does not prove a real circuit is safe.',
};

/** Checks that hold whatever the sketch does, so programmable pins are tried both ways. */
export function validate(doc: CircuitDocument, registry: Lookup): Finding[] {
  const findings: Finding[] = [];
  const model = new CircuitModel(doc, registry);

  const nodeRails = new Map<string, Set<number>>();
  for (const { c, d } of model.components) {
    for (const pin of d.pins) {
      if (pin.volts === undefined) continue;
      const node = model.node(c.id, pin.id);
      nodeRails.set(node, (nodeRails.get(node) ?? new Set()).add(pin.volts));
    }
  }
  for (const volts of nodeRails.values()) {
    if (volts.size > 1) {
      findings.push({
        id: 'power-short',
        severity: 'error',
        message: `Short circuit: ${[...volts].sort((a, b) => b - a).join(' V and ')} V are wired together. Remove the wire joining them.`,
      });
    }
  }

  const idle: Inputs = { pins: new Map(), pressed: new Set(), turned: new Map() };
  const high: Inputs = { ...idle, pins: new Map(allGpio(model, 1)) };
  const low: Inputs = { ...idle, pins: new Map(allGpio(model, 0)) };
  const fixed = model.solve(idle);
  const driveHigh = model.solve(high);
  const driveLow = model.solve(low);

  for (const { c, d } of model.components) {
    const e = d.electrical;
    if (e?.kind === 'diode') {
      const name = d.name;
      const onHigh = driveHigh.diodes.find((x) => x.instance === c.id)!;
      const onLow = driveLow.diodes.find((x) => x.instance === c.id)!;
      const a = fixed.voltageAt(model.node(c.id, e.anode));
      const k = fixed.voltageAt(model.node(c.id, e.cathode));
      const anodeSeen = onHigh.anode;
      const cathodeSeen = onLow.cathode ?? onHigh.cathode;
      if (!anodeSeen && !cathodeSeen) {
        findings.push({
          id: 'disconnected',
          severity: 'error',
          instance: c.id,
          message: `${name} is not connected to anything yet.`,
        });
        continue;
      }
      if (a && k && a.volts < k.volts) {
        findings.push({
          id: 'led-reversed',
          severity: 'error',
          instance: c.id,
          message: `${name} is backwards: its long leg must face the positive side.`,
        });
        continue;
      }
      const gpioBackwards = !a && k && k.volts > 0.5;
      const groundOnAnode = a && a.volts === 0 && !k && onHigh.cathode;
      if (gpioBackwards || groundOnAnode) {
        findings.push({
          id: 'led-reversed',
          severity: 'error',
          instance: c.id,
          message: `${name} is backwards: its long leg must face the positive side.`,
        });
        continue;
      }
      if (!cathodeSeen) {
        findings.push({
          id: 'missing-ground',
          severity: 'error',
          instance: c.id,
          message: `${name} has no path to ground. Connect its short leg to GND, through a resistor if needed.`,
        });
      } else if (!anodeSeen) {
        findings.push({
          id: 'disconnected',
          severity: 'error',
          instance: c.id,
          message: `${name}'s long leg is not connected.`,
        });
      } else if (onHigh.milliamps > 30) {
        findings.push({
          id: 'led-no-resistor',
          severity: 'hazard',
          instance: c.id,
          message: `${name} has no current-limiting resistor. A real LED or pin could be damaged. Add about 220 Ω in series.`,
        });
      }
    }
    if (e?.kind === 'resistor' || e?.kind === 'switch') {
      const near = (pin: string) => model.isConnected(c.id, pin);
      if (!near(e.a) || !near(e.b)) {
        findings.push({
          id: 'disconnected',
          severity: 'error',
          instance: c.id,
          message: `One side of ${d.name} is not connected.`,
        });
      }
    }
  }
  findings.push(MODEL_LIMITATION);
  return findings;
}

function allGpio(
  model: CircuitModel,
  level: number,
): [number, { mode: 'output'; level: number }][] {
  const out: [number, { mode: 'output'; level: number }][] = [];
  for (let pin = 0; pin < 20; pin++) {
    if (model.gpioNode(pin)) out.push([pin, { mode: 'output', level }]);
  }
  return out;
}
