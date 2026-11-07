import {
  addComponent,
  addWire,
  buildNetlist,
  emptyCircuit,
  moveComponent,
  pinKey,
  removeComponent,
  type ComponentInstance,
} from '@pin-thirteen/circuit-core';
import { describe, expect, it } from 'vitest';
import { findPinAt, pinPosition, registry, seatOnBoard } from './index';

const lookup = (type: string) => registry.get(type)?.connectivity;
const make = (id: string, type: string, x = 0, y = 0): ComponentInstance => ({
  id,
  type,
  position: { x, y },
  rotation: 0,
  params: {},
});
const boardDoc = () => addComponent(make('bb', 'breadboard-830')).apply(emptyCircuit());
const net = (doc: ReturnType<typeof boardDoc>) => buildNetlist(doc, lookup);

describe('830 breadboard', () => {
  const definition = registry.get('breadboard-830')!;
  it('has exactly 830 unique tie-points', () => {
    expect(definition.pins).toHaveLength(830);
    expect(new Set(definition.pins.map((p) => p.id)).size).toBe(830);
  });
  it('joins a-e and f-j but not across the groove', () => {
    const n = net(boardDoc());
    expect(n.netOf(pinKey('bb', 'a1'))).toContain(pinKey('bb', 'e1'));
    expect(n.netOf(pinKey('bb', 'f1'))).toContain(pinKey('bb', 'j1'));
    expect(n.netOf(pinKey('bb', 'a1'))).not.toContain(pinKey('bb', 'f1'));
    expect(n.netOf(pinKey('bb', 'a1'))).not.toContain(pinKey('bb', 'a2'));
  });
  it('joins each rail along its length, separately from the others', () => {
    const n = net(boardDoc());
    expect(n.netOf(pinKey('bb', 'T+1'))).toContain(pinKey('bb', 'T+50'));
    expect(n.netOf(pinKey('bb', 'T+1'))).not.toContain(pinKey('bb', 'T-1'));
    expect(n.netOf(pinKey('bb', 'T+1'))).not.toContain(pinKey('bb', 'B+1'));
    expect(n.nets).toHaveLength(63 * 2 + 4);
  });
});

describe('netlist', () => {
  it('joins an LED circuit through wires and seats, and stops at the resistor', () => {
    let doc = boardDoc();
    doc = addComponent(make('uno', 'uno-r3', 0, 300)).apply(doc);
    doc = addComponent({
      ...make('r', 'resistor'),
      placement: { board: 'bb', pins: { a: 'a5', b: 'a10' } },
    }).apply(doc);
    doc = addWire({
      id: 'w',
      from: { instance: 'uno', pin: 'D13' },
      to: { instance: 'bb', pin: 'c5' },
      style: { colour: 'mint' },
    }).apply(doc);
    const n = net(doc);
    expect(n.netOf(pinKey('uno', 'D13'))).toContain(pinKey('r', 'a'));
    expect(n.netOf(pinKey('uno', 'D13'))).not.toContain(pinKey('r', 'b'));
  });
  it('treats all UNO grounds as one net', () => {
    const doc = addComponent(make('uno', 'uno-r3')).apply(emptyCircuit());
    expect(net(doc).netOf(pinKey('uno', 'GND_1'))).toContain(pinKey('uno', 'GND_TOP'));
  });
});

describe('placement', () => {
  it('seats a resistor in free holes and refuses occupied ones', () => {
    const doc = boardDoc();
    const a1 = pinPosition(doc, registry, 'bb', 'a5')!;
    const r = make('r', 'resistor', a1.x + 56, a1.y + 3);
    const seat = seatOnBoard(doc, registry, r)!;
    expect(seat.placement.pins).toEqual({ a: 'a5', b: 'a13' });
    const seated = addComponent({ ...r, ...seat }).apply(doc);
    const again = seatOnBoard(seated, registry, make('s', 'led-5mm', a1.x + 100, 500));
    expect(again).toBeUndefined();
  });
  it('carries seated parts with the board, and frees them when it is removed', () => {
    let doc = addComponent({
      ...make('r', 'resistor', 100, 50),
      placement: { board: 'bb', pins: { a: 'a5', b: 'a13' } },
    }).apply(boardDoc());
    doc = moveComponent('bb', { x: 10, y: 20 }).apply(doc);
    expect(doc.components[1]!.position).toEqual({ x: 110, y: 70 });
    doc = removeComponent('bb').apply(doc);
    expect(doc.components[0]!.placement).toBeUndefined();
  });
});

it('finds a hole by position', () => {
  const doc = boardDoc();
  const hole = pinPosition(doc, registry, 'bb', 'j63')!;
  expect(findPinAt(doc, registry, { x: hole.x + 2, y: hole.y - 2 })?.pin).toBe('j63');
  expect(findPinAt(doc, registry, { x: -500, y: -500 })).toBeUndefined();
});
