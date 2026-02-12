import { getDB, STORE_DAILY_PROGRESS, type DailyProgressRecord } from "./db";

/** 每日任務題數 */
export const TODAY_SET_SIZE = 20;
/** 今日任務領獎答對率門檻（70%） */
export const TODAY_REWARD_CORRECT_RATIO = 0.7;
/** 答對至少幾題才可領今日獎勵 */
export const MIN_CORRECT_FOR_TODAY_REWARD = Math.ceil(TODAY_SET_SIZE * TODAY_REWARD_CORRECT_RATIO);

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayKey(): string {
  return getTodayDateString();
}

export async function getTodayProgress(): Promise<{
  completed: number;
  total: number;
  correctCount: number;
  completedAt?: number;
}> {
  if (typeof window === "undefined") return { completed: 0, total: TODAY_SET_SIZE, correctCount: 0 };
  const db = await getDB();
  const record = await db.get(STORE_DAILY_PROGRESS, todayKey());
  if (!record) return { completed: 0, total: TODAY_SET_SIZE, correctCount: 0 };
  const r = record as DailyProgressRecord;
  return {
    completed: r.questionsCompleted,
    total: TODAY_SET_SIZE,
    correctCount: r.correctCount ?? 0,
    completedAt: r.completedAt,
  };
}

/** 每答一題時計入今日任務進度（僅「今日任務」頁 /today 呼叫）；correct 為該題是否答對。 */
export async function incrementTodayProgress(correct: boolean): Promise<{
  completed: number;
  total: number;
  correctCount: number;
  justCompleted?: boolean;
  justStreak7?: boolean;
}> {
  if (typeof window === "undefined") return { completed: 0, total: TODAY_SET_SIZE, correctCount: 0 };
  const db = await getDB();
  const key = todayKey();
  const existing = (await db.get(STORE_DAILY_PROGRESS, key)) as DailyProgressRecord | undefined;
  const prev = existing?.questionsCompleted ?? 0;
  const prevCorrect = existing?.correctCount ?? 0;
  const next = Math.min(TODAY_SET_SIZE, prev + 1);
  const nextCorrect = correct ? Math.min(TODAY_SET_SIZE, prevCorrect + 1) : prevCorrect;
  const completedAt = next >= TODAY_SET_SIZE ? Date.now() : existing?.completedAt;
  const record: DailyProgressRecord = {
    date: key,
    questionsCompleted: next,
    correctCount: nextCorrect,
    completedAt,
  };
  await db.put(STORE_DAILY_PROGRESS, record);
  const justCompleted = prev < TODAY_SET_SIZE && next >= TODAY_SET_SIZE;
  const streak = await getStreak();
  const justStreak7 = justCompleted && streak >= 7;
  return {
    completed: next,
    total: TODAY_SET_SIZE,
    correctCount: nextCorrect,
    ...(justCompleted && { justCompleted: true }),
    ...(justStreak7 && { justStreak7: true }),
  };
}

// Backward-compatible alias
export const completeTodayQuestion = incrementTodayProgress;

export async function getStreak(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const db = await getDB();
  const all = (await db.getAll(STORE_DAILY_PROGRESS)) as DailyProgressRecord[];
  const completedDays = all
    .filter(
      (r) =>
        r.questionsCompleted >= TODAY_SET_SIZE &&
        (r.correctCount ?? r.questionsCompleted) >= MIN_CORRECT_FOR_TODAY_REWARD
    )
    .map((r) => r.date)
    .sort()
    .reverse();
  if (completedDays.length === 0) return 0;
  const today = todayKey();
  const idx = completedDays.indexOf(today);
  if (idx < 0) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, "0");
    const d = String(yesterday.getDate()).padStart(2, "0");
    const yesterdayKey = `${y}-${m}-${d}`;
    if (completedDays[0] !== yesterdayKey) return 0;
    let k = 1;
    for (let i = 1; i < completedDays.length; i++) {
      const prev = new Date(completedDays[i]);
      const next = new Date(completedDays[i - 1]);
      const diff = (next.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
      if (diff !== 1) break;
      k++;
    }
    return k;
  }
  let k = 1;
  for (let i = idx + 1; i < completedDays.length; i++) {
    const prev = new Date(completedDays[i]);
    const next = new Date(completedDays[i - 1]);
    const diff = (next.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
    if (diff !== 1) break;
    k++;
  }
  return k;
}

export async function getRecentBadgeDays(): Promise<string[]> {
  if (typeof window === "undefined") return [];
  const db = await getDB();
  const all = (await db.getAll(STORE_DAILY_PROGRESS)) as DailyProgressRecord[];
  return all
    .filter(
      (r) =>
        r.questionsCompleted >= TODAY_SET_SIZE &&
        (r.correctCount ?? r.questionsCompleted) >= MIN_CORRECT_FOR_TODAY_REWARD &&
        r.completedAt != null
    )
    .map((r) => r.date)
    .sort()
    .reverse();
}
