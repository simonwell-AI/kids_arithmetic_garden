import { getDB, STORE_SESSIONS, STORE_ATTEMPTS, STORE_SKILL_WEIGHTS, STORE_DAILY_PROGRESS, STORE_WALLET, STORE_INVENTORY, STORE_GARDEN } from "./db";

export interface ExportData {
  version: number;
  exportedAt: number;
  sessions: unknown[];
  attempts: unknown[];
  skillWeights: unknown[];
  dailyProgress: unknown[];
  wallet: unknown[];
  inventory: unknown[];
  garden: unknown[];
}

const EXPORT_VERSION = 2;

export async function exportToJson(): Promise<string> {
  if (typeof window === "undefined") throw new Error("Export is only available in the browser");
  const db = await getDB();
  const [sessions, attempts, skillWeights, dailyProgress, wallet, inventory, garden] = await Promise.all([
    db.getAll(STORE_SESSIONS),
    db.getAll(STORE_ATTEMPTS),
    db.getAll(STORE_SKILL_WEIGHTS),
    db.getAll(STORE_DAILY_PROGRESS),
    db.getAll(STORE_WALLET),
    db.getAll(STORE_INVENTORY),
    db.getAll(STORE_GARDEN),
  ]);
  const data: ExportData = {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    sessions,
    attempts,
    skillWeights,
    dailyProgress,
    wallet,
    inventory,
    garden,
  };
  return JSON.stringify(data, null, 2);
}

export async function importFromJson(jsonText: string, merge: boolean): Promise<void> {
  if (typeof window === "undefined") throw new Error("Import is only available in the browser");
  const data = JSON.parse(jsonText) as ExportData;
  if (!data || typeof data.version !== "number") throw new Error("Invalid export format");
  const db = await getDB();
  if (!merge) {
    await Promise.all([
      db.clear(STORE_SESSIONS),
      db.clear(STORE_ATTEMPTS),
      db.clear(STORE_SKILL_WEIGHTS),
      db.clear(STORE_DAILY_PROGRESS),
      db.clear(STORE_WALLET),
      db.clear(STORE_INVENTORY),
      db.clear(STORE_GARDEN),
    ]);
  }
  if (Array.isArray(data.sessions) && data.sessions.length > 0) {
    const tx = db.transaction(STORE_SESSIONS, "readwrite");
    for (const r of data.sessions) {
      if (r && typeof (r as { id?: string }).id === "string") await tx.store.put(r);
    }
    await tx.done;
  }
  if (Array.isArray(data.attempts) && data.attempts.length > 0) {
    const tx = db.transaction(STORE_ATTEMPTS, "readwrite");
    for (const r of data.attempts) {
      if (r && typeof (r as { id?: string }).id === "string") await tx.store.put(r);
    }
    await tx.done;
  }
  if (Array.isArray(data.skillWeights) && data.skillWeights.length > 0) {
    const tx = db.transaction(STORE_SKILL_WEIGHTS, "readwrite");
    for (const r of data.skillWeights) {
      if (r && typeof (r as { skillKey?: string }).skillKey === "string") await tx.store.put(r);
    }
    await tx.done;
  }
  if (Array.isArray(data.dailyProgress) && data.dailyProgress.length > 0) {
    const tx = db.transaction(STORE_DAILY_PROGRESS, "readwrite");
    for (const r of data.dailyProgress) {
      if (r && typeof (r as { date?: string }).date === "string") await tx.store.put(r);
    }
    await tx.done;
  }
  if (Array.isArray((data as ExportData).wallet) && (data as ExportData).wallet.length > 0) {
    const tx = db.transaction(STORE_WALLET, "readwrite");
    for (const r of (data as ExportData).wallet) {
      if (r && typeof (r as { id?: string }).id === "string") await tx.store.put(r);
    }
    await tx.done;
  }
  if (Array.isArray((data as ExportData).inventory) && (data as ExportData).inventory.length > 0) {
    const tx = db.transaction(STORE_INVENTORY, "readwrite");
    for (const r of (data as ExportData).inventory) {
      if (r && typeof (r as { id?: string }).id === "string") await tx.store.put(r);
    }
    await tx.done;
  }
  if (Array.isArray((data as ExportData).garden) && (data as ExportData).garden.length > 0) {
    const tx = db.transaction(STORE_GARDEN, "readwrite");
    for (const r of (data as ExportData).garden) {
      if (r && typeof (r as { id?: string }).id === "string") await tx.store.put(r);
    }
    await tx.done;
  }
}

export function downloadExport(blob: Blob, filename = "kid-arithmetic-export.json"): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
