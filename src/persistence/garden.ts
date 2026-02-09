import { getDB, STORE_GARDEN, GARDEN_KEY, type GardenRecord } from "./db";
import {
  useSeed,
  useWater,
  useFertilizerBasic,
  useFertilizerPremium,
  useInsecticide,
  hasTool,
} from "./inventory";
import { getHasWeeds, setLastGardenVisit } from "./gardenVisit";
import { addCoins } from "./wallet";

const MAX_GROWTH_STAGE = 4; // 0..4, 4 = 開花
/** 開花後收成發放的代幣 */
const HARVEST_BLOOM_COINS = 8;
const GROWTH_PER_DAY_WATER = 0.2;
const GROWTH_PER_DAY_FERTILIZER_BASIC = 0.3;
const GROWTH_PER_DAY_FERTILIZER_PREMIUM = 0.5;
const WEED_PENALTY_MULTIPLIER = 0.7;
const WEED_PENALTY_MIST_MULTIPLIER = 0.85;
const FORK_BOOST_MULTIPLIER = 1.1;
const MIST_BOOST_MULTIPLIER = 1.15;
const SOIL_QUALITY_BOOST = 0.1;
/** 鬆土冷卻時間（5 分鐘） */
const FORK_COOLDOWN_MS = 5 * 60 * 1000;
/** 噴霧冷卻時間（5 分鐘） */
const MIST_COOLDOWN_MS = 5 * 60 * 1000;
/** 修剪雜草冷卻時間（3 小時） */
const WEED_COOLDOWN_MS = 3 * 60 * 60 * 1000;
/** 蟲害時成長速率懲罰係數 */
const BUG_PENALTY_MULTIPLIER = 0.6;
/** 進入花園時有蟲害的機率（僅在幼苗以上且目前無蟲時判定） */
const BUG_PROBABILITY = 0.15;
const FORK_GROWTH_BONUS = 0.12;
const MIST_GROWTH_BONUS = 0.05;
const TROWEL_GROWTH_BONUS = 0.5;
const FERTILIZER_BOTTLE_BONUS_BASIC = 0.15;
const FERTILIZER_BOTTLE_BONUS_PREMIUM = 0.25;

async function getGardenRecord(): Promise<GardenRecord | null> {
  const db = await getDB();
  const record = (await db.get(STORE_GARDEN, GARDEN_KEY)) as GardenRecord | undefined;
  return record ?? null;
}

function getGrowthRate(record: GardenRecord): number {
  let rate = GROWTH_PER_DAY_WATER;
  if (record.fertilizerType === "basic") rate += GROWTH_PER_DAY_FERTILIZER_BASIC;
  else if (record.fertilizerType === "premium") rate += GROWTH_PER_DAY_FERTILIZER_PREMIUM;
  if (record.soilQualityBoost != null) {
    rate *= 1 + record.soilQualityBoost;
  }
  const now = Date.now();
  if (record.soilBoostUntil != null && now < record.soilBoostUntil) {
    rate *= FORK_BOOST_MULTIPLIER;
  }
  if (record.mistBoostUntil != null && now < record.mistBoostUntil) {
    rate *= MIST_BOOST_MULTIPLIER;
  }
  if (getHasWeeds()) {
    rate *= record.mistBoostUntil != null && now < record.mistBoostUntil
      ? WEED_PENALTY_MIST_MULTIPLIER
      : WEED_PENALTY_MULTIPLIER;
  }
  if (record.hasBugs) {
    rate *= BUG_PENALTY_MULTIPLIER;
  }
  return rate;
}

function computeGrowthValue(record: GardenRecord & { growthStage?: number }): number {
  const dayMs = 24 * 60 * 60 * 1000;
  const lastCare = Math.max(
    record.lastWateredAt ?? 0,
    record.lastFertilizedAt ?? record.plantedAt,
    record.lastMistedAt ?? 0
  );
  const daysSinceCare = (Date.now() - lastCare) / dayMs;
  const rate = getGrowthRate(record);
  const base = record.growthValue ?? (record as { growthStage?: number }).growthStage ?? 0;
  return base + daysSinceCare * rate;
}

function growthValueToStage(value: number): number {
  return Math.min(MAX_GROWTH_STAGE, Math.max(0, Math.floor(value)));
}

async function saveGarden(record: GardenRecord): Promise<void> {
  const db = await getDB();
  await db.put(STORE_GARDEN, record);
}

/** 取得花園狀態；會依時間計算當前成長階段；有機率在幼苗以上時觸發蟲害 */
export async function getGarden(): Promise<{
  seedId: string;
  plantedAt: number;
  growthStage: number;
  isBloom: boolean;
  lastWateredAt?: number;
  lastFertilizedAt?: number;
  fertilizerType?: "basic" | "premium";
  lastForkedAt?: number;
  soilBoostUntil?: number;
  lastMistedAt?: number;
  mistBoostUntil?: number;
  soilQualityBoost?: number;
  trowelUsed?: boolean;
  lastTrimmedAt?: number;
  hasBugs?: boolean;
} | null> {
  if (typeof window === "undefined") return null;
  const record = await getGardenRecord();
  if (!record) return null;
  const value = computeGrowthValue(record);
  const growthStage = growthValueToStage(value);
  if (growthStage >= 1 && !record.hasBugs && Math.random() < BUG_PROBABILITY) {
    record.hasBugs = true;
    await saveGarden(record);
  }
  return {
    seedId: record.seedId,
    plantedAt: record.plantedAt,
    growthStage,
    isBloom: growthStage >= MAX_GROWTH_STAGE,
    lastWateredAt: record.lastWateredAt,
    lastFertilizedAt: record.lastFertilizedAt,
    fertilizerType: record.fertilizerType,
    lastForkedAt: record.lastForkedAt,
    soilBoostUntil: record.soilBoostUntil,
    lastMistedAt: record.lastMistedAt,
    mistBoostUntil: record.mistBoostUntil,
    soilQualityBoost: record.soilQualityBoost,
    trowelUsed: record.trowelUsed,
    lastTrimmedAt: record.lastTrimmedAt,
    hasBugs: record.hasBugs ?? false,
  };
}

/** 種植：消耗一顆種子，建立花園記錄 */
export async function plantSeed(seedId: string): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const existing = await getGardenRecord();
  if (existing) return { success: false, message: "已有植物，請先收成或等待開花後再種" };
  const used = await useSeed(seedId);
  if (!used) return { success: false, message: "沒有此種子" };
  const record: GardenRecord = {
    id: GARDEN_KEY,
    seedId,
    plantedAt: Date.now(),
    growthValue: 0,
  };
  await saveGarden(record);
  return { success: true };
}

/** 澆水：消耗 1 水，更新 lastWateredAt */
export async function water(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getGardenRecord();
  if (!record) return { success: false, message: "尚未種植" };
  const currentValue = computeGrowthValue(record);
  if (growthValueToStage(currentValue) >= MAX_GROWTH_STAGE) return { success: false, message: "已經開花了" };
  const used = await useWater();
  if (!used) return { success: false, message: "沒有水" };
  record.growthValue = currentValue;
  record.lastWateredAt = Date.now();
  await saveGarden(record);
  return { success: true };
}

/** 施肥：選擇一般或高級，消耗對應數量 */
export async function fertilize(type: "basic" | "premium"): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getGardenRecord();
  if (!record) return { success: false, message: "尚未種植" };
  const currentValue = computeGrowthValue(record);
  if (growthValueToStage(currentValue) >= MAX_GROWTH_STAGE) return { success: false, message: "已經開花了" };
  const used = type === "basic" ? await useFertilizerBasic() : await useFertilizerPremium();
  if (!used) return { success: false, message: type === "basic" ? "沒有一般肥料" : "沒有高級肥料" };
  record.growthValue = currentValue;
  record.lastFertilizedAt = Date.now();
  record.fertilizerType = type;
  const hasBottle = await hasTool("fertilizer_bottle");
  if (hasBottle) {
    record.growthValue += type === "basic" ? FERTILIZER_BOTTLE_BONUS_BASIC : FERTILIZER_BOTTLE_BONUS_PREMIUM;
  }
  await saveGarden(record);
  return { success: true };
}

/** 收成：清空花園，可再種新種子；若已開花則發放代幣 */
export async function harvest(): Promise<{ success: boolean; message?: string; coinsAwarded?: number }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getGardenRecord();
  if (!record) return { success: false, message: "尚未種植" };
  const value = computeGrowthValue(record);
  const stage = growthValueToStage(value);
  let coinsAwarded: number | undefined;
  if (stage >= MAX_GROWTH_STAGE) {
    await addCoins(HARVEST_BLOOM_COINS);
    coinsAwarded = HARVEST_BLOOM_COINS;
  }
  const db = await getDB();
  await db.delete(STORE_GARDEN, GARDEN_KEY);
  return { success: true, coinsAwarded };
}

/** 修剪雜草：需要園藝剪刀，清除雜草並給少量成長；每 3 小時可剪一次 */
export async function trimWeeds(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  if (!getHasWeeds()) return { success: false, message: "目前沒有雜草" };
  const hasScissors = await hasTool("garden_scissors");
  if (!hasScissors) return { success: false, message: "需要園藝剪刀" };
  const record = await getGardenRecord();
  if (!record) return { success: false, message: "尚未種植" };
  const now = Date.now();
  if (record.lastTrimmedAt != null && now - record.lastTrimmedAt < WEED_COOLDOWN_MS) {
    return { success: false, message: "需再等一段時間才能再修剪雜草" };
  }
  record.growthValue = computeGrowthValue(record) + 0.1;
  record.lastTrimmedAt = now;
  await saveGarden(record);
  setLastGardenVisit();
  return { success: true };
}

/** 鬆土：需要園藝叉，每日一次，小幅加速成長 */
export async function loosenSoil(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getGardenRecord();
  if (!record) return { success: false, message: "尚未種植" };
  const hasFork = await hasTool("garden_fork");
  if (!hasFork) return { success: false, message: "需要園藝叉" };
  const now = Date.now();
  if (record.lastForkedAt && now - record.lastForkedAt < FORK_COOLDOWN_MS) {
    return { success: false, message: "今天已經鬆土過了" };
  }
  record.growthValue = computeGrowthValue(record) + FORK_GROWTH_BONUS;
  record.lastForkedAt = now;
  record.soilBoostUntil = now + FORK_COOLDOWN_MS;
  await saveGarden(record);
  return { success: true };
}

/** 噴霧保濕：需要噴霧器，提升短時間成長效率 */
export async function mistPlant(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getGardenRecord();
  if (!record) return { success: false, message: "尚未種植" };
  const hasMister = await hasTool("plant_mister");
  if (!hasMister) return { success: false, message: "需要噴霧器" };
  const now = Date.now();
  if (record.lastMistedAt && now - record.lastMistedAt < MIST_COOLDOWN_MS) {
    return { success: false, message: "剛噴過，稍後再來" };
  }
  record.growthValue = computeGrowthValue(record) + MIST_GROWTH_BONUS;
  record.lastMistedAt = now;
  record.mistBoostUntil = now + 12 * 60 * 60 * 1000;
  await saveGarden(record);
  return { success: true };
}

/** 換盆整理：需要園藝鏟，僅一次性大幅成長 */
export async function repotPlant(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getGardenRecord();
  if (!record) return { success: false, message: "尚未種植" };
  const hasTrowel = await hasTool("garden_trowel");
  if (!hasTrowel) return { success: false, message: "需要園藝鏟" };
  const currentValue = computeGrowthValue(record);
  if (growthValueToStage(currentValue) < 1) return { success: false, message: "幼苗太小，稍後再整理" };
  if (record.trowelUsed) return { success: false, message: "這株已整理過了" };
  record.growthValue = currentValue + TROWEL_GROWTH_BONUS;
  record.trowelUsed = true;
  await saveGarden(record);
  return { success: true };
}

/** 添加營養土：需要盆栽土，永久小幅加成 */
export async function applyPottingSoil(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getGardenRecord();
  if (!record) return { success: false, message: "尚未種植" };
  const hasSoil = await hasTool("potting_soil");
  if (!hasSoil) return { success: false, message: "需要盆栽土" };
  if (record.soilQualityBoost != null) return { success: false, message: "已經添加過營養土" };
  record.growthValue = computeGrowthValue(record);
  record.soilQualityBoost = SOIL_QUALITY_BOOST;
  await saveGarden(record);
  return { success: true };
}

/** 噴殺蟲劑除蟲：消耗 1 殺蟲劑，清除蟲害 */
export async function removeBugsWithSpray(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getGardenRecord();
  if (!record) return { success: false, message: "尚未種植" };
  if (!record.hasBugs) return { success: false, message: "目前沒有蟲害" };
  const used = await useInsecticide();
  if (!used) return { success: false, message: "沒有殺蟲劑，請到商店購買" };
  record.growthValue = computeGrowthValue(record);
  record.hasBugs = false;
  await saveGarden(record);
  setLastGardenVisit();
  return { success: true };
}

