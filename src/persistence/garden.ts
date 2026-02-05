import { getDB, STORE_GARDEN, GARDEN_KEY, type GardenRecord } from "./db";
import { useSeed, useWater, useFertilizerBasic, useFertilizerPremium } from "./inventory";

const MAX_GROWTH_STAGE = 4; // 0..4, 4 = 開花
const GROWTH_PER_DAY_WATER = 0.2;
const GROWTH_PER_DAY_FERTILIZER_BASIC = 0.3;
const GROWTH_PER_DAY_FERTILIZER_PREMIUM = 0.5;

async function getGardenRecord(): Promise<GardenRecord | null> {
  const db = await getDB();
  const record = (await db.get(STORE_GARDEN, GARDEN_KEY)) as GardenRecord | undefined;
  return record ?? null;
}

function getGrowthRate(record: GardenRecord): number {
  let rate = GROWTH_PER_DAY_WATER;
  if (record.fertilizerType === "basic") rate += GROWTH_PER_DAY_FERTILIZER_BASIC;
  else if (record.fertilizerType === "premium") rate += GROWTH_PER_DAY_FERTILIZER_PREMIUM;
  return rate;
}

function computeGrowthValue(record: GardenRecord & { growthStage?: number }): number {
  const dayMs = 24 * 60 * 60 * 1000;
  const lastCare = Math.max(
    record.lastWateredAt ?? 0,
    record.lastFertilizedAt ?? record.plantedAt
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

/** 取得花園狀態；會依時間計算當前成長階段 */
export async function getGarden(): Promise<{
  seedId: string;
  plantedAt: number;
  growthStage: number;
  isBloom: boolean;
  lastWateredAt?: number;
  lastFertilizedAt?: number;
  fertilizerType?: "basic" | "premium";
} | null> {
  if (typeof window === "undefined") return null;
  const record = await getGardenRecord();
  if (!record) return null;
  const value = computeGrowthValue(record);
  const growthStage = growthValueToStage(value);
  return {
    seedId: record.seedId,
    plantedAt: record.plantedAt,
    growthStage,
    isBloom: growthStage >= MAX_GROWTH_STAGE,
    lastWateredAt: record.lastWateredAt,
    lastFertilizedAt: record.lastFertilizedAt,
    fertilizerType: record.fertilizerType,
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
  await saveGarden(record);
  return { success: true };
}

/** 收成：清空花園，可再種新種子 */
export async function harvest(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const db = await getDB();
  await db.delete(STORE_GARDEN, GARDEN_KEY);
  return { success: true };
}
