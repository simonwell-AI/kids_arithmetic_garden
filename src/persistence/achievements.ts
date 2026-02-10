import { getDB, STORE_ACHIEVEMENTS, ACHIEVEMENTS_KEY, type AchievementRecord } from "./db";
import { addCoins } from "./wallet";

/** 解鎖成就時發放的代幣 */
const UNLOCK_COINS = 2;

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(s: string): Date {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function daysBetween(a: string, b: string): number {
  const d1 = parseDate(a).getTime();
  const d2 = parseDate(b).getTime();
  return Math.round((d2 - d1) / (24 * 60 * 60 * 1000));
}

async function getAchievementRecord(): Promise<AchievementRecord> {
  const db = await getDB();
  const existing = (await db.get(STORE_ACHIEVEMENTS, ACHIEVEMENTS_KEY)) as AchievementRecord | undefined;
  if (existing) return existing;
  const defaultRecord: AchievementRecord = {
    id: ACHIEVEMENTS_KEY,
    firstBloomUnlocked: false,
    gardenStreak7Unlocked: false,
    lastGardenVisitDate: "",
    gardenConsecutiveDays: 0,
    bugsRemovedCount: 0,
    bugsRemoved5Unlocked: false,
    weedsTrimmedCount: 0,
    weedsTrimmed3Unlocked: false,
    plantedSeedIds: [],
  };
  await db.put(STORE_ACHIEVEMENTS, defaultRecord);
  return defaultRecord;
}

async function saveAchievements(record: AchievementRecord): Promise<void> {
  const db = await getDB();
  await db.put(STORE_ACHIEVEMENTS, record);
}

export interface AchievementState {
  firstBloomUnlocked: boolean;
  gardenStreak7Unlocked: boolean;
  gardenConsecutiveDays: number;
  bugsRemovedCount: number;
  bugsRemoved5Unlocked: boolean;
  weedsTrimmedCount: number;
  weedsTrimmed3Unlocked: boolean;
}

export async function getAchievements(): Promise<AchievementState> {
  if (typeof window === "undefined") {
    return {
      firstBloomUnlocked: false,
      gardenStreak7Unlocked: false,
      gardenConsecutiveDays: 0,
      bugsRemovedCount: 0,
      bugsRemoved5Unlocked: false,
      weedsTrimmedCount: 0,
      weedsTrimmed3Unlocked: false,
    };
  }
  const r = await getAchievementRecord();
  return {
    firstBloomUnlocked: r.firstBloomUnlocked,
    gardenStreak7Unlocked: r.gardenStreak7Unlocked,
    gardenConsecutiveDays: r.gardenConsecutiveDays,
    bugsRemovedCount: r.bugsRemovedCount,
    bugsRemoved5Unlocked: r.bugsRemoved5Unlocked,
    weedsTrimmedCount: r.weedsTrimmedCount,
    weedsTrimmed3Unlocked: r.weedsTrimmed3Unlocked,
  };
}

/** 第一次開花（收成開花株時呼叫）；回傳是否剛解鎖與代幣數 */
export async function unlockFirstBloom(): Promise<{ justUnlocked: boolean; coinsAwarded: number }> {
  if (typeof window === "undefined") return { justUnlocked: false, coinsAwarded: 0 };
  const r = await getAchievementRecord();
  if (r.firstBloomUnlocked) return { justUnlocked: false, coinsAwarded: 0 };
  r.firstBloomUnlocked = true;
  r.firstBloomUnlockedAt = Date.now();
  await saveAchievements(r);
  await addCoins(UNLOCK_COINS);
  return { justUnlocked: true, coinsAwarded: UNLOCK_COINS };
}

/** 記錄今日進花園，更新連續天數；若達 7 天則解鎖並發代幣。回傳 { consecutiveDays, justUnlocked, coinsAwarded } */
export async function recordGardenVisit(): Promise<{
  consecutiveDays: number;
  justUnlocked: boolean;
  coinsAwarded: number;
}> {
  if (typeof window === "undefined") return { consecutiveDays: 0, justUnlocked: false, coinsAwarded: 0 };
  const r = await getAchievementRecord();
  const today = todayDateString();
  if (r.lastGardenVisitDate === today) {
    return {
      consecutiveDays: r.gardenConsecutiveDays,
      justUnlocked: false,
      coinsAwarded: 0,
    };
  }
  const daysDiff = r.lastGardenVisitDate ? daysBetween(r.lastGardenVisitDate, today) : 1;
  if (daysDiff === 1) {
    r.gardenConsecutiveDays += 1;
  } else {
    r.gardenConsecutiveDays = 1;
  }
  r.lastGardenVisitDate = today;
  let justUnlocked = false;
  let coinsAwarded = 0;
  if (r.gardenConsecutiveDays >= 7 && !r.gardenStreak7Unlocked) {
    r.gardenStreak7Unlocked = true;
    r.gardenStreak7UnlockedAt = Date.now();
    await addCoins(UNLOCK_COINS);
    justUnlocked = true;
    coinsAwarded = UNLOCK_COINS;
  }
  await saveAchievements(r);
  return { consecutiveDays: r.gardenConsecutiveDays, justUnlocked, coinsAwarded };
}

/** 除蟲成功時呼叫；達 5 次解鎖並發代幣。回傳是否剛解鎖與代幣數 */
export async function incrementBugsRemoved(): Promise<{ justUnlocked: boolean; coinsAwarded: number }> {
  if (typeof window === "undefined") return { justUnlocked: false, coinsAwarded: 0 };
  const r = await getAchievementRecord();
  r.bugsRemovedCount += 1;
  let justUnlocked = false;
  let coinsAwarded = 0;
  if (r.bugsRemovedCount >= 5 && !r.bugsRemoved5Unlocked) {
    r.bugsRemoved5Unlocked = true;
    r.bugsRemoved5UnlockedAt = Date.now();
    await addCoins(UNLOCK_COINS);
    justUnlocked = true;
    coinsAwarded = UNLOCK_COINS;
  }
  await saveAchievements(r);
  return { justUnlocked, coinsAwarded };
}

/** 剪雜草成功時呼叫；達 3 次解鎖並發代幣。回傳是否剛解鎖與代幣數 */
export async function incrementWeedsTrimmed(): Promise<{ justUnlocked: boolean; coinsAwarded: number }> {
  if (typeof window === "undefined") return { justUnlocked: false, coinsAwarded: 0 };
  const r = await getAchievementRecord();
  r.weedsTrimmedCount += 1;
  let justUnlocked = false;
  let coinsAwarded = 0;
  if (r.weedsTrimmedCount >= 3 && !r.weedsTrimmed3Unlocked) {
    r.weedsTrimmed3Unlocked = true;
    r.weedsTrimmed3UnlockedAt = Date.now();
    await addCoins(UNLOCK_COINS);
    justUnlocked = true;
    coinsAwarded = UNLOCK_COINS;
  }
  await saveAchievements(r);
  return { justUnlocked, coinsAwarded };
}

/** 取得曾種過的種子 ID 列表（商店用於不販賣已種過的種子） */
export async function getPlantedSeedIds(): Promise<string[]> {
  if (typeof window === "undefined") return [];
  const r = await getAchievementRecord();
  return r.plantedSeedIds ?? [];
}

/** 記錄曾種過此種子（種植成功時呼叫） */
export async function addPlantedSeedId(seedId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const r = await getAchievementRecord();
  if (!r.plantedSeedIds) r.plantedSeedIds = [];
  if (!r.plantedSeedIds.includes(seedId)) {
    r.plantedSeedIds.push(seedId);
    await saveAchievements(r);
  }
}
