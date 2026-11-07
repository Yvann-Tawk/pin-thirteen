import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { loadLatestProject, saveProject } from './persistence';

const project = (id: string, updatedAt: string) => ({
  schemaVersion: 1,
  id,
  name: id,
  updatedAt,
  sketch: '',
  circuit: { components: [], wires: [] },
});

describe('persistence', () => {
  it('returns the most recently saved project', async () => {
    await saveProject(project('old', '2026-01-01T00:00:00Z'));
    await saveProject(project('new', '2026-02-01T00:00:00Z'));
    expect((await loadLatestProject())?.id).toBe('new');
  });
});
