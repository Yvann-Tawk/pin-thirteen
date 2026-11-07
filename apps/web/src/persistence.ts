import type { Project } from '@pin-thirteen/circuit-core';
import { openDB } from 'idb';

const DB_NAME = 'pin-thirteen';
const STORE = 'projects';

const database = () =>
  openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: 'id' });
    },
  });

export async function saveProject(project: Project): Promise<void> {
  const db = await database();
  await db.put(STORE, project);
  db.close();
}

export async function loadLatestProject(): Promise<Project | undefined> {
  const db = await database();
  const all = (await db.getAll(STORE)) as Project[];
  db.close();
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

/** Asks the browser not to evict saved work. It may say no, so export stays the real backup. */
export async function requestPersistence(): Promise<void> {
  await navigator.storage?.persist?.();
}
