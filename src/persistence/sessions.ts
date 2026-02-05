import { getDB, STORE_SESSIONS, STORE_ATTEMPTS, type SessionRecord, type AttemptRecord } from './db';

export async function saveSession(record: SessionRecord): Promise<void> {
  const db = await getDB();
  await db.put(STORE_SESSIONS, record);
}

export async function getSession(id: string): Promise<SessionRecord | undefined> {
  const db = await getDB();
  return db.get(STORE_SESSIONS, id);
}

export async function getSessions(limit = 50): Promise<SessionRecord[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_SESSIONS);
  all.sort((a, b) => b.startedAt - a.startedAt);
  return all.slice(0, limit);
}

export async function updateSessionEnd(id: string, endedAt: number): Promise<void> {
  const existing = await getSession(id);
  if (existing) {
    await saveSession({ ...existing, endedAt });
  }
}

export function createSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function saveAttempt(record: AttemptRecord): Promise<void> {
  const db = await getDB();
  await db.put(STORE_ATTEMPTS, record);
}

export function createAttemptId(): string {
  return `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function getAttemptsBySession(sessionId: string): Promise<AttemptRecord[]> {
  const db = await getDB();
  const index = db.transaction(STORE_ATTEMPTS).store.index('by-sessionId');
  return index.getAll(sessionId);
}
