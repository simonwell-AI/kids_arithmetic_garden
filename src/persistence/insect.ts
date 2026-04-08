import { getDB, STORE_INSECT, INSECT_KEY, type InsectRecord } from "./db";
import { useInsectFood, useMiteSpray, useStagBeetleLarva, useButterflyEgg, useBeeEgg, useCicadaEgg, useStickInsectEgg, getInventoryState, hasTool, useTool, useAdvancedInsectGrowthMedicine } from "./inventory";
import { addCoins } from "./wallet";

const INSECT_MAX_STAGE = 5;
/** 放生成蟲發放代幣 */
const RELEASE_COINS = 50;

/** 記錄「曾養過的昆蟲種類」的 key（存在同一個 STORE_INSECT） */
const RAISED_INSECT_IDS_KEY = "raised_insect_ids";
type RaisedInsectsRecord = { id: string; insectIds: string[] };

async function getRaisedInsectsRecord(): Promise<RaisedInsectsRecord | null> {
  const db = await getDB();
  const record = await db.get(STORE_INSECT, RAISED_INSECT_IDS_KEY);
  return (record as RaisedInsectsRecord | undefined) ?? null;
}

/** 取得曾養過的昆蟲種類（商店用來隱藏已養過的蟲卵／幼蟲） */
export async function getRaisedInsectIds(): Promise<string[]> {
  if (typeof window === "undefined") return [];
  const record = await getRaisedInsectsRecord();
  return record?.insectIds ?? [];
}

/** 將某種昆蟲標記為「已養過」；在 startInsect 成功時呼叫 */
export async function markInsectAsRaised(insectId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const record = await getRaisedInsectsRecord();
  const ids = record?.insectIds ?? [];
  if (ids.includes(insectId)) return;
  const db = await getDB();
  await db.put(STORE_INSECT, { id: RAISED_INSECT_IDS_KEY, insectIds: [...ids, insectId] });
}
/** 每次餵食增加成長值 */
const GROWTH_PER_FEED = 0.2;
/** 每日自然成長（無蟎時） */
const GROWTH_PER_DAY_NATURAL = 0.08;
/** 有蟎時成長率係數 */
const MITE_PENALTY_MULTIPLIER = 0.6;
/** 未清潔糞便超過此時長視為生病，成長變慢（供 UI 預警倒數用） */
export const DIRTY_HABITAT_AFTER_MS = 1 * 60 * 60 * 1000; // 1 小時
/** 生病（飼養箱髒）時成長率係數 */
const SICK_PENALTY_MULTIPLIER = 0.6;
/** 進入蟲屋時觸發蟎的機率（幼蟲/蛹階段） */
const MITE_PROBABILITY = 0.15;
/** 進入蟲屋時隨機出現大便的機率（目前未生病時才擲骰） */
const POOP_PROBABILITY = 0.15;
/** 除蟎後多久內不再觸發（10 分鐘） */
const MITE_COOLDOWN_MS = 10 * 60 * 1000;
/** 昆蟲小鏟冷卻時間（30 分鐘） */
export const SHOVEL_COOLDOWN_MS = 30 * 60 * 1000;
/** 餵食冷卻（同一隻蟲 4 小時內可餵次數不限，但可選：簡化為無冷卻或 1 次/小時） */
const FEED_COOLDOWN_MS = 0;

async function getInsectRecord(): Promise<InsectRecord | null> {
  const db = await getDB();
  const record = (await db.get(STORE_INSECT, INSECT_KEY)) as InsectRecord | undefined;
  return record ?? null;
}

function growthValueToStage(value: number): number {
  return Math.min(INSECT_MAX_STAGE, Math.max(1, Math.floor(value) + 1));
}

function computeGrowthValue(record: InsectRecord): number {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const lastCare = record.lastFedAt ?? record.plantedAt;
  const daysSinceCare = (now - lastCare) / dayMs;
  let rate = GROWTH_PER_DAY_NATURAL * (record.hasMites ? MITE_PENALTY_MULTIPLIER : 1);
  const lastClean = record.lastClipsUsedAt ?? record.plantedAt;
  if (now - lastClean > DIRTY_HABITAT_AFTER_MS) {
    rate *= SICK_PENALTY_MULTIPLIER;
  }
  return record.growthValue + daysSinceCare * rate;
}

function isDirtyHabitat(record: InsectRecord): boolean {
  const now = Date.now();
  const lastClean = record.lastClipsUsedAt ?? record.plantedAt;
  return now - lastClean > DIRTY_HABITAT_AFTER_MS;
}

async function saveInsect(record: InsectRecord): Promise<void> {
  const db = await getDB();
  await db.put(STORE_INSECT, record);
}

/** 取得蟲屋狀態；會依時間計算當前成長階段；進入時有機率觸發蟎（幼蟲/蛹階段） */
export async function getInsect(): Promise<{
  insectId: string;
  plantedAt: number;
  growthValue: number;
  growthStage: number;
  lastFedAt?: number;
  feedCount?: number;
  hasMites?: boolean;
  lastMiteRemovedAt?: number;
  lastShovelUsedAt?: number;
  /** 上次用夾子清潔糞便的時間（用於生病預警） */
  lastClipsUsedAt?: number;
  /** 是否因久未清潔糞便而生病（生長變慢） */
  hasDirtyHabitat?: boolean;
} | null> {
  if (typeof window === "undefined") return null;
  const record = await getInsectRecord();
  if (!record) return null;

  const value = computeGrowthValue(record);
  const stage = growthValueToStage(value);

  record.growthValue = value;
  record.hasMites = record.hasMites ?? false;
  const now = Date.now();
  const miteCooldownOk = record.lastMiteRemovedAt == null || now - record.lastMiteRemovedAt > MITE_COOLDOWN_MS;
  if (stage < INSECT_MAX_STAGE && !record.hasMites && miteCooldownOk && Math.random() < MITE_PROBABILITY) {
    record.hasMites = true;
  }

  let dirty = isDirtyHabitat(record);
  if (!dirty && Math.random() < POOP_PROBABILITY) {
    record.lastClipsUsedAt = now - DIRTY_HABITAT_AFTER_MS - 60000;
    dirty = true;
  }
  await saveInsect(record);

  return {
    insectId: record.insectId,
    plantedAt: record.plantedAt,
    growthValue: record.growthValue,
    growthStage: growthValueToStage(record.growthValue),
    lastFedAt: record.lastFedAt,
    feedCount: record.feedCount,
    hasMites: record.hasMites,
    lastMiteRemovedAt: record.lastMiteRemovedAt,
    lastShovelUsedAt: record.lastShovelUsedAt,
    lastClipsUsedAt: record.lastClipsUsedAt,
    hasDirtyHabitat: dirty,
  };
}

/** 清除飼養（不放生、不發代幣）：用於「變更昆蟲」時捨棄目前昆蟲，原幼蟲/蟲卵不會退還 */
export async function clearInsectWithoutRelease(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getInsectRecord();
  if (!record) return { success: false, message: "尚未飼養" };
  const db = await getDB();
  await db.delete(STORE_INSECT, INSECT_KEY);
  return { success: true };
}

/** 開始飼養：消耗 1 隻幼蟲／蟲卵，建立飼養記錄。需有飼養箱且背包有對應幼蟲或蟲卵。 */
export async function startInsect(insectId: string): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const inv = await getInventoryState();
  if (!inv.hasInsectHabitat) return { success: false, message: "需要先購買飼養箱" };
  const existing = await getInsectRecord();
  if (existing) return { success: false, message: "已經在飼養中，請先「變更昆蟲」再換養" };

  if (insectId === "stag_beetle") {
    if ((inv.stagBeetleLarva ?? 0) < 1) return { success: false, message: "需要鍬形蟲幼蟲，請到商店購買" };
    const used = await useStagBeetleLarva();
    if (!used) return { success: false, message: "幼蟲不足" };
  } else if (insectId === "butterfly") {
    if ((inv.butterflyEgg ?? 0) < 1) return { success: false, message: "需要蝴蝶蟲卵，請到商店購買" };
    const used = await useButterflyEgg();
    if (!used) return { success: false, message: "蝴蝶蟲卵不足" };
  } else if (insectId === "bee") {
    if ((inv.beeEgg ?? 0) < 1) return { success: false, message: "需要蜜蜂蟲卵，請到商店購買" };
    const used = await useBeeEgg();
    if (!used) return { success: false, message: "蜜蜂蟲卵不足" };
  } else if (insectId === "cicada") {
    if ((inv.cicadaEgg ?? 0) < 1) return { success: false, message: "需要蟬蟲卵，請到商店購買" };
    const used = await useCicadaEgg();
    if (!used) return { success: false, message: "蟬蟲卵不足" };
  } else if (insectId === "stick_insect") {
    if ((inv.stickInsectEgg ?? 0) < 1) return { success: false, message: "需要竹節蟲蟲卵，請到商店購買" };
    const used = await useStickInsectEgg();
    if (!used) return { success: false, message: "竹節蟲蟲卵不足" };
  } else {
    return { success: false, message: "不支援此昆蟲類型" };
  }

  const record: InsectRecord = {
    id: INSECT_KEY,
    insectId,
    growthValue: 0,
    plantedAt: Date.now(),
    feedCount: 0,
  };
  await saveInsect(record);
  await markInsectAsRaised(insectId);
  return { success: true };
}

/** 餵食：消耗 1 個飼料，增加成長值 */
export async function feedInsect(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getInsectRecord();
  if (!record) return { success: false, message: "尚未開始飼養" };

  const used = await useInsectFood();
  if (!used) return { success: false, message: "沒有昆蟲飼料，請到商店購買" };

  record.growthValue = computeGrowthValue(record);
  record.growthValue = Math.min(5, record.growthValue + GROWTH_PER_FEED);
  record.lastFedAt = Date.now();
  record.feedCount = (record.feedCount ?? 0) + 1;
  await saveInsect(record);
  return { success: true };
}

/** 放生：成蟲階段時發放代幣並清空記錄 */
export async function releaseInsect(): Promise<{ success: boolean; message?: string; coinsAwarded?: number }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getInsectRecord();
  if (!record) return { success: false, message: "尚未開始飼養" };

  const value = computeGrowthValue(record);
  const stage = growthValueToStage(value);
  if (stage < INSECT_MAX_STAGE) return { success: false, message: "還沒長大成蟲，再養一下吧" };

  await addCoins(RELEASE_COINS);
  const db = await getDB();
  await db.delete(STORE_INSECT, INSECT_KEY);
  return { success: true, coinsAwarded: RELEASE_COINS };
}

/** 除蟎：消耗 1 除蟎劑，清除蟎狀態 */
export async function removeMites(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getInsectRecord();
  if (!record) return { success: false, message: "尚未開始飼養" };
  if (!record.hasMites) return { success: false, message: "目前沒有蟎" };

  const used = await useMiteSpray();
  if (!used) return { success: false, message: "沒有除蟎劑，請到商店購買" };

  record.growthValue = computeGrowthValue(record);
  record.hasMites = false;
  record.lastMiteRemovedAt = Date.now();
  await saveInsect(record);
  return { success: true };
}

/** 清潔飼養箱（小鏟）：消耗 1 昆蟲小鏟，小幅增加成長值；有冷卻時間 */
const CLEAN_SHOVEL_GROWTH_BONUS = 0.05;

export async function cleanWithShovel(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getInsectRecord();
  if (!record) return { success: false, message: "尚未開始飼養" };
  const has = await hasTool("insect_shovel");
  if (!has) return { success: false, message: "沒有昆蟲小鏟，請到商店購買" };
  const now = Date.now();
  if (record.lastShovelUsedAt != null && now - record.lastShovelUsedAt < SHOVEL_COOLDOWN_MS) {
    return { success: false, message: "小鏟使用後需冷卻一段時間，稍後再整理" };
  }
  const used = await useTool("insect_shovel");
  if (!used) return { success: false, message: "無法使用小鏟" };
  record.growthValue = Math.min(5, computeGrowthValue(record) + CLEAN_SHOVEL_GROWTH_BONUS);
  record.lastShovelUsedAt = now;
  await saveInsect(record);
  return { success: true };
}

/** 清潔飼養箱（夾子）：消耗 1 昆蟲夾子，小幅增加成長值 */
const CLEAN_CLIPS_GROWTH_BONUS = 0.05;

export async function cleanWithClips(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getInsectRecord();
  if (!record) return { success: false, message: "尚未開始飼養" };
  const has = await hasTool("insect_clips");
  if (!has) return { success: false, message: "沒有昆蟲夾子，請到商店購買" };
  const used = await useTool("insect_clips");
  if (!used) return { success: false, message: "無法使用夾子" };
  record.growthValue = Math.min(5, computeGrowthValue(record) + CLEAN_CLIPS_GROWTH_BONUS);
  record.lastClipsUsedAt = Date.now();
  await saveInsect(record);
  return { success: true };
}

/** 高級昆蟲成長藥：消耗 1 瓶，讓昆蟲直接進入下一成長階段 */
export async function useGrowthMedicine(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getInsectRecord();
  if (!record) return { success: false, message: "尚未開始飼養" };
  const used = await useAdvancedInsectGrowthMedicine();
  if (!used) return { success: false, message: "沒有高級昆蟲成長藥，請到商店購買" };
  const currentValue = computeGrowthValue(record);
  const currentStage = growthValueToStage(currentValue);
  if (currentStage >= INSECT_MAX_STAGE) {
    return { success: false, message: "已經是成蟲了，不需要再使用成長藥" };
  }
  /** 下一階段的最小成長值：階段 2=1、階段 3=2、…、階段 5=4 */
  record.growthValue = Math.min(INSECT_MAX_STAGE, currentStage);
  await saveInsect(record);
  return { success: true };
}
