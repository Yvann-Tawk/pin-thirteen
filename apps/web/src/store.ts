import {
  addComponent,
  addWire,
  moveComponent,
  removeWire,
  rotateComponent,
  setParam,
  type Endpoint,
  type Point,
  type Wire,
  CURRENT_SCHEMA_VERSION,
  emptyCircuit,
  execute,
  parseProject,
  redo,
  removeComponent,
  serializeProject,
  startHistory,
  undo,
  type CircuitDocument,
  type Command,
  type ComponentInstance,
  type History,
  type ComponentTypeId,
  type Project,
} from '@pin-thirteen/circuit-core';
import { registry, seatOnBoard } from '@pin-thirteen/registry';
import { create } from 'zustand';
import { loadLatestProject, saveProject } from './persistence';

export const BLINK_SKETCH = `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
`;

const newId = () => crypto.randomUUID();

function instance(type: ComponentTypeId, x: number, y: number): ComponentInstance {
  const params = Object.fromEntries(
    (registry.get(type)?.params ?? []).map((p) => [p.key, p.default]),
  );
  return { id: newId(), type, position: { x, y }, rotation: 0, params };
}

const starterCircuit = (): CircuitDocument => {
  const doc = emptyCircuit();
  return {
    ...doc,
    components: [instance('uno-r3', 340, 60), instance('breadboard-830', 50, 395)],
  };
};

/** Free spots on the stage until drag placement arrives in Phase 2. */
const SPOTS = [
  [70, 210],
  [150, 210],
  [230, 210],
  [70, 320],
  [150, 320],
  [230, 320],
] as const;

export const WIRE_COLOURS = {
  apricot: '#ffd179',
  mint: '#84f8d5',
  yellow: '#ffee9a',
  blue: '#acd5ff',
} as const;
const COLOUR_ORDER = Object.keys(WIRE_COLOURS) as Wire['style']['colour'][];

const FIT = { zoom: 1, x: 0, y: 0 };

interface AppState {
  projectId: string;
  projectName: string;
  sketch: string;
  history: History;
  selected: string | null;
  selectedWire: string | null;
  draft: Endpoint | null;
  view: { zoom: number; x: number; y: number };
  status: string;
  init(): Promise<void>;
  place(type: ComponentTypeId): void;
  remove(id: string): void;
  select(id: string | null): void;
  selectWire(id: string | null): void;
  moveTo(id: string, position: Point): void;
  rotate(id: string): void;
  setParam(id: string, key: string, value: number): void;
  pinClicked(endpoint: Endpoint): void;
  connect(from: Endpoint, to: Endpoint): boolean;
  cancelDraft(): void;
  removeSelectedWire(): void;
  zoomAt(factor: number, at: Point): void;
  panTo(position: Point): void;
  fitView(): void;
  undo(): void;
  redo(): void;
  reset(): void;
  save(): Promise<void>;
  exportFile(): void;
  importFile(text: string): void;
}

const toProject = (s: AppState): Project => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: s.projectId,
  name: s.projectName,
  updatedAt: new Date().toISOString(),
  sketch: s.sketch,
  circuit: s.history.present,
});

const fromProject = (p: Project) => ({
  projectId: p.id,
  projectName: p.name,
  sketch: p.sketch,
  history: startHistory(p.circuit),
  selected: null,
  selectedWire: null,
  draft: null,
});

export const useApp = create<AppState>((set, get) => {
  const run = (command: Command) => set((s) => ({ history: execute(s.history, command) }));
  return {
    projectId: newId(),
    projectName: 'My first circuit',
    sketch: BLINK_SKETCH,
    history: startHistory(starterCircuit()),
    selected: null,
    selectedWire: null,
    draft: null,
    view: FIT,
    status: '',
    async init() {
      try {
        const saved = await loadLatestProject();
        if (!saved) return;
        // Stored data is revalidated, as it may come from an older version.
        const parsed = parseProject(JSON.stringify(saved));
        if (parsed.ok) set({ ...fromProject(parsed.project), status: 'Saved project reopened.' });
        else set({ status: parsed.message });
      } catch {
        set({ status: 'Saved projects are unavailable in this browser. Export keeps your work.' });
      }
    },
    place(type) {
      const count = get().history.present.components.length;
      const spot = SPOTS[count % SPOTS.length] ?? SPOTS[0];
      const component = instance(type, spot[0], spot[1]);
      run(addComponent(component));
      set({ selected: component.id });
    },
    remove(id) {
      run(removeComponent(id));
      set({ selected: null });
    },
    select: (selected) => set({ selected, selectedWire: null }),
    selectWire: (selectedWire) => set({ selectedWire, selected: null }),
    moveTo(id, position) {
      const doc = get().history.present;
      const component = doc.components.find((c) => c.id === id);
      if (!component) return;
      const seat = seatOnBoard(doc, registry, { ...component, position });
      run(moveComponent(id, seat?.position ?? position, seat?.placement));
    },
    rotate(id) {
      const doc = get().history.present;
      const component = doc.components.find((c) => c.id === id);
      if (!component) return;
      const rotation = ((component.rotation + 90) % 360) as typeof component.rotation;
      const seat = seatOnBoard(doc, registry, { ...component, rotation });
      run(rotateComponent(id, rotation, seat?.position, seat?.placement));
    },
    setParam: (id, key, value) => run(setParam(id, key, value)),
    pinClicked(endpoint) {
      const { draft, connect } = get();
      if (!draft) {
        set({
          draft: endpoint,
          status: 'Wire started. Click another pin, or press Esc to cancel.',
        });
        return;
      }
      if (connect(draft, endpoint)) set({ draft: null });
    },
    connect(from, to) {
      const doc = get().history.present;
      const valid = (e: Endpoint) => {
        const type = doc.components.find((c) => c.id === e.instance)?.type;
        return !!type && !!registry.get(type)?.pins.some((p) => p.id === e.pin);
      };
      if (!valid(from) || !valid(to)) {
        set({ status: 'That pin name was not found. Check the spelling, such as D13 or a5.' });
        return false;
      }
      if (from.instance === to.instance && from.pin === to.pin) {
        set({ status: 'A wire needs two different pins. Pick another pin.', draft: null });
        return false;
      }
      const same = (a: Endpoint, b: Endpoint) => a.instance === b.instance && a.pin === b.pin;
      if (
        doc.wires.some(
          (w) => (same(w.from, from) && same(w.to, to)) || (same(w.from, to) && same(w.to, from)),
        )
      ) {
        set({ status: 'Those pins already have a wire.', draft: null });
        return false;
      }
      const colour = COLOUR_ORDER[doc.wires.length % COLOUR_ORDER.length] ?? 'mint';
      run(addWire({ id: newId(), from, to, style: { colour } }));
      set({ status: 'Wire added.' });
      return true;
    },
    cancelDraft: () => set((s) => (s.draft ? { draft: null, status: 'Wire cancelled.' } : s)),
    removeSelectedWire() {
      const id = get().selectedWire;
      if (id) run(removeWire(id));
      set({ selectedWire: null });
    },
    zoomAt(factor, at) {
      set(({ view }) => {
        const zoom = Math.min(4, Math.max(0.4, view.zoom * factor));
        const k = zoom / view.zoom;
        return { view: { zoom, x: at.x - (at.x - view.x) * k, y: at.y - (at.y - view.y) * k } };
      });
    },
    panTo: (p) => set(({ view }) => ({ view: { ...view, ...p } })),
    fitView: () => set({ view: FIT }),
    undo: () => set((s) => ({ history: undo(s.history), selected: null, selectedWire: null })),
    redo: () => set((s) => ({ history: redo(s.history), selected: null, selectedWire: null })),
    reset() {
      const next = starterCircuit();
      run({ label: 'Reset circuit', apply: () => next });
      set({ selected: null, status: 'Circuit reset. Undo brings it back.' });
    },
    async save() {
      try {
        await saveProject(toProject(get()));
        set({ status: 'Saved in this browser.' });
      } catch {
        set({ status: 'Could not save here. Export a file to keep your work.' });
      }
    },
    exportFile() {
      const url = URL.createObjectURL(
        new Blob([serializeProject(toProject(get()))], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pin-thirteen-project.json';
      link.click();
      URL.revokeObjectURL(url);
    },
    importFile(text) {
      const parsed = parseProject(text);
      if (!parsed.ok) return set({ status: parsed.message });
      set({ ...fromProject(parsed.project), status: `Opened ${parsed.project.name}.` });
    },
  };
});
