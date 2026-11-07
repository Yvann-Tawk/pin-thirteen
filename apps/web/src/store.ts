import {
  addComponent,
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
import { registry } from '@pin-thirteen/registry';
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
  return { ...doc, components: [instance('uno-r3', 45, 172)] };
};

/** Free spots on the stage until drag placement arrives in Phase 2. */
const SPOTS = [
  [560, 120],
  [680, 120],
  [800, 120],
  [920, 120],
  [560, 300],
  [680, 300],
  [800, 300],
  [920, 300],
  [560, 470],
  [680, 470],
  [800, 470],
  [920, 470],
] as const;

interface AppState {
  projectId: string;
  projectName: string;
  sketch: string;
  history: History;
  selected: string | null;
  status: string;
  init(): Promise<void>;
  place(type: ComponentTypeId): void;
  remove(id: string): void;
  select(id: string | null): void;
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
});

export const useApp = create<AppState>((set, get) => {
  const run = (command: Command) => set((s) => ({ history: execute(s.history, command) }));
  return {
    projectId: newId(),
    projectName: 'My first circuit',
    sketch: BLINK_SKETCH,
    history: startHistory(starterCircuit()),
    selected: null,
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
    select: (selected) => set({ selected }),
    undo: () => set((s) => ({ history: undo(s.history), selected: null })),
    redo: () => set((s) => ({ history: redo(s.history), selected: null })),
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
