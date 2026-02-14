import { getDB, STORE_ACHIEVEMENTS, ACHIEVEMENTS_KEY, type AchievementRecord } from "./db";
import { addCoins } from "./wallet";
import { getStreak } from "./dailyProgress";

/** 解鎖成就時發放的代幣 */
const UNLOCK_COINS = 2;
/** 植物收藏家（種過 6 種）解鎖代幣 */
const PLANTED_6_COINS = 5;
/** 熟練園丁（收成 10 次）解鎖代幣 */
const HARVEST_10_COINS = 5;
/** 今日任務連續 7 天解鎖代幣 */
const TODAY_STREAK_7_COINS = 5;

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
    planted3Unlocked: false,
    planted6Unlocked: false,
    harvestCount: 0,
    harvest3Unlocked: false,
    harvest10Unlocked: false,
    todayStreak3Unlocked: false,
    todayStreak7Unlocked: false,
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
  planted3Unlocked: boolean;
  planted6Unlocked: boolean;
  plantedSeedCount: number;
  harvestCount: number;
  harvest3Unlocked: boolean;
  harvest10Unlocked: boolean;
  todayStreak: number;
  todayStreak3Unlocked: boolean;
  todayStreak7Unlocked: boolean;
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
      planted3Unlocked: false,
      planted6Unlocked: false,
      plantedSeedCount: 0,
      harvestCount: 0,
      harvest3Unlocked: false,
      harvest10Unlocked: false,
      todayStreak: 0,
      todayStreak3Unlocked: false,
      todayStreak7Unlocked: false,
    };
  }
  const r = await getAchievementRecord();
  const plantedCount = r.plantedSeedIds?.length ?? 0;
  const todayStreak = await getStreak();
  return {
    firstBloomUnlocked: r.firstBloomUnlocked,
    gardenStreak7Unlocked: r.gardenStreak7Unlocked,
    gardenConsecutiveDays: r.gardenConsecutiveDays,
    bugsRemovedCount: r.bugsRemovedCount,
    bugsRemoved5Unlocked: r.bugsRemoved5Unlocked,
    weedsTrimmedCount: r.weedsTrimmedCount,
    weedsTrimmed3Unlocked: r.weedsTrimmed3Unlocked,
    planted3Unlocked: r.planted3Unlocked ?? false,
    planted6Unlocked: r.planted6Unlocked ?? false,
    plantedSeedCount: plantedCount,
    harvestCount: r.harvestCount ?? 0,
    harvest3Unlocked: r.harvest3Unlocked ?? false,
    harvest10Unlocked: r.harvest10Unlocked ?? false,
    todayStreak,
    todayStreak3Unlocked: r.todayStreak3Unlocked ?? false,
    todayStreak7Unlocked: r.todayStreak7Unlocked ?? false,
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

/** 開花收成成功時呼叫；達 3 次解鎖豐收、達 10 次解鎖熟練園丁並發代幣 */
export async function incrementHarvestCount(): Promise<{
  harvest3JustUnlocked?: boolean;
  harvest10JustUnlocked?: boolean;
  coinsAwarded: number;
}> {
  if (typeof window === "undefined") return { coinsAwarded: 0 };
  const r = await getAchievementRecord();
  r.harvestCount = (r.harvestCount ?? 0) + 1;
  let coinsAwarded = 0;
  let harvest3JustUnlocked = false;
  let harvest10JustUnlocked = false;
  if (r.harvestCount >= 3 && !(r.harvest3Unlocked ?? false)) {
    r.harvest3Unlocked = true;
    r.harvest3UnlockedAt = Date.now();
    await addCoins(UNLOCK_COINS);
    coinsAwarded += UNLOCK_COINS;
    harvest3JustUnlocked = true;
  }
  if (r.harvestCount >= 10 && !(r.harvest10Unlocked ?? false)) {
    r.harvest10Unlocked = true;
    r.harvest10UnlockedAt = Date.now();
    await addCoins(HARVEST_10_COINS);
    coinsAwarded += HARVEST_10_COINS;
    harvest10JustUnlocked = true;
  }
  await saveAchievements(r);
  return {
    ...(harvest3JustUnlocked && { harvest3JustUnlocked: true }),
    ...(harvest10JustUnlocked && { harvest10JustUnlocked: true }),
    coinsAwarded,
  };
}

/** 今日任務完成領獎時呼叫（傳入當時的連續天數）；達 3 天／7 天解鎖成就並發代幣 */
export async function checkTodayStreakAchievements(streak: number): Promise<{
  todayStreak3JustUnlocked?: boolean;
  todayStreak7JustUnlocked?: boolean;
  coinsAwarded: number;
}> {
  if (typeof window === "undefined") return { coinsAwarded: 0 };
  const r = await getAchievementRecord();
  let coinsAwarded = 0;
  let todayStreak3JustUnlocked = false;
  let todayStreak7JustUnlocked = false;
  if (streak >= 3 && !(r.todayStreak3Unlocked ?? false)) {
    r.todayStreak3Unlocked = true;
    r.todayStreak3UnlockedAt = Date.now();
    await addCoins(UNLOCK_COINS);
    coinsAwarded += UNLOCK_COINS;
    todayStreak3JustUnlocked = true;
  }
  if (streak >= 7 && !(r.todayStreak7Unlocked ?? false)) {
    r.todayStreak7Unlocked = true;
    r.todayStreak7UnlockedAt = Date.now();
    await addCoins(TODAY_STREAK_7_COINS);
    coinsAwarded += TODAY_STREAK_7_COINS;
    todayStreak7JustUnlocked = true;
  }
  if (coinsAwarded > 0) await saveAchievements(r);
  return {
    ...(todayStreak3JustUnlocked && { todayStreak3JustUnlocked: true }),
    ...(todayStreak7JustUnlocked && { todayStreak7JustUnlocked: true }),
    coinsAwarded,
  };
}

/** 取得曾種過的種子 ID 列表（商店用於不販賣已種過的種子） */
export async function getPlantedSeedIds(): Promise<string[]> {
  if (typeof window === "undefined") return [];
  const r = await getAchievementRecord();
  return r.plantedSeedIds ?? [];
}

/** 記錄曾種過此種子（種植成功時呼叫）；若解鎖小園丁／植物收藏家則發代幣並回傳 */
export async function addPlantedSeedId(seedId: string): Promise<{
  planted3JustUnlocked?: boolean;
  planted6JustUnlocked?: boolean;
  coinsAwarded: number;
}> {
  if (typeof window === "undefined") return { coinsAwarded: 0 };
  const r = await getAchievementRecord();
  if (!r.plantedSeedIds) r.plantedSeedIds = [];
  if (!r.plantedSeedIds.includes(seedId)) {
    r.plantedSeedIds.push(seedId);
    let coinsAwarded = 0;
    let planted3JustUnlocked = false;
    let planted6JustUnlocked = false;
    if (r.plantedSeedIds.length >= 3 && !(r.planted3Unlocked ?? false)) {
      r.planted3Unlocked = true;
      r.planted3UnlockedAt = Date.now();
      await addCoins(UNLOCK_COINS);
      coinsAwarded += UNLOCK_COINS;
      planted3JustUnlocked = true;
    }
    if (r.plantedSeedIds.length >= 6 && !(r.planted6Unlocked ?? false)) {
      r.planted6Unlocked = true;
      r.planted6UnlockedAt = Date.now();
      await addCoins(PLANTED_6_COINS);
      coinsAwarded += PLANTED_6_COINS;
      planted6JustUnlocked = true;
    }
    await saveAchievements(r);
    return {
      ...(planted3JustUnlocked && { planted3JustUnlocked: true }),
      ...(planted6JustUnlocked && { planted6JustUnlocked: true }),
      coinsAwarded,
    };
  }
  return { coinsAwarded: 0 };
}
