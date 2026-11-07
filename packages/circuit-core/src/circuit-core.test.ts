import { describe, expect, it } from 'vitest';
import {
  addComponent,
  addWire,
  emptyCircuit,
  execute,
  moveComponent,
  parseProject,
  redo,
  removeComponent,
  serializeProject,
  startHistory,
  undo,
  type ComponentInstance,
  type Project,
} from './index';

const part = (id: string): ComponentInstance => ({
  id,
  type: 'led-5mm',
  position: { x: 0, y: 0 },
  rotation: 0,
  params: {},
});

const project = (): Project => ({
  schemaVersion: 1,
  id: 'p1',
  name: 'Test',
  updatedAt: '2026-11-07T00:00:00.000Z',
  sketch: 'void setup() {}',
  circuit: { components: [part('a'), part('b')], wires: [] },
});

describe('commands', () => {
  it('removes attached wires with a component', () => {
    let doc = addComponent(part('a')).apply(emptyCircuit());
    doc = addComponent(part('b')).apply(doc);
    doc = addWire({
      id: 'w',
      from: { instance: 'a', pin: 'anode' },
      to: { instance: 'b', pin: 'anode' },
      style: { colour: 'mint' },
    }).apply(doc);
    expect(removeComponent('a').apply(doc)).toEqual({ components: [part('b')], wires: [] });
  });

  it('rejects wires to missing components', () => {
    const wire = {
      id: 'w',
      from: { instance: 'x', pin: 'a' },
      to: { instance: 'y', pin: 'b' },
      style: { colour: 'mint' as const },
    };
    expect(() => addWire(wire).apply(emptyCircuit())).toThrow();
  });
});

describe('history', () => {
  it('undoes and redoes back to identical documents', () => {
    let h = startHistory(emptyCircuit());
    h = execute(h, addComponent(part('a')));
    h = execute(h, moveComponent('a', { x: 5, y: 6 }));
    const end = h.present;
    h = undo(undo(h));
    expect(h.present).toEqual(emptyCircuit());
    expect(redo(redo(h)).present).toEqual(end);
  });

  it('clears redo after a new edit, and ignores empty undo', () => {
    let h = execute(startHistory(emptyCircuit()), addComponent(part('a')));
    h = execute(undo(h), addComponent(part('b')));
    expect(h.future).toEqual([]);
    const fresh = startHistory(emptyCircuit());
    expect(undo(fresh)).toBe(fresh);
  });
});

describe('project files', () => {
  it('round-trips', () => {
    const parsed = parseProject(serializeProject(project()));
    expect(parsed).toEqual({ ok: true, project: project() });
  });

  it.each([
    ['not json', '{'],
    ['wrong shape', '{"schemaVersion":1}'],
    ['a primitive', '3'],
  ])('rejects %s', (_, text) => {
    expect(parseProject(text).ok).toBe(false);
  });

  it('explains files from a newer version', () => {
    const result = parseProject(JSON.stringify({ ...project(), schemaVersion: 99 }));
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining('newer') });
  });

  it('rejects dangling wires and duplicate ids', () => {
    const dangling = project();
    dangling.circuit.wires.push({
      id: 'w',
      from: { instance: 'gone', pin: 'p' },
      to: { instance: 'a', pin: 'anode' },
      style: { colour: 'mint' },
    });
    expect(parseProject(serializeProject(dangling)).ok).toBe(false);
    const dupes = project();
    dupes.circuit.components.push(part('a'));
    expect(parseProject(serializeProject(dupes)).ok).toBe(false);
  });
});
