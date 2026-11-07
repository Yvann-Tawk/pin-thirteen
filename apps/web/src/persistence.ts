import type { Project } from '@pin-thirteen/circuit-core';
import { openDB } from 'idb';

const DB_NAME = 'pin-thirteen';
const STORE = 'projects';

const PROGRESS = 'progress';

const database = () =>
  openDB(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) db.createObjectStore(STORE, { keyPath: 'id' });
      if (oldVersion < 2) db.createObjectStore(PROGRESS);
    },
  });

export async function saveCompleted(lessons: string[]): Promise<void> {
  const db = await database();
  await db.put(PROGRESS, lessons, 'completed');
  db.close();
}

export async function loadCompleted(): Promise<string[]> {
  const db = await database();
  const value = (await db.get(PROGRESS, 'completed')) as string[] | undefined;
  db.close();
  return value ?? [];
}

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
