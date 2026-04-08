import { getDB, STORE_FISH, FISH_KEY, type FishRecord } from "./db";
import { getInventoryState, useGoldfishEgg, useFishFood, useTool } from "./inventory";
import { addCoins } from "./wallet";

const FISH_MAX_STAGE = 5;
const GROWTH_PER_FEED = 0.25;
const GROWTH_PER_DAY_NATURAL = 0.06;
const RELEASE_COINS = 50;

async function getFishRecord(): Promise<FishRecord | null> {
  const db = await getDB();
  const record = (await db.get(STORE_FISH, FISH_KEY)) as FishRecord | undefined;
  return record ?? null;
}

async function saveFish(record: FishRecord): Promise<void> {
  const db = await getDB();
  await db.put(STORE_FISH, record);
}

function growthValueToStage(value: number): number {
  return Math.min(FISH_MAX_STAGE, Math.max(1, Math.floor(value) + 1));
}

function computeGrowthValue(record: FishRecord): number {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const lastCare = record.lastFedAt ?? record.startedAt;
  const daysSinceCare = (now - lastCare) / dayMs;
  return record.growthValue + daysSinceCare * GROWTH_PER_DAY_NATURAL;
}

export async function getFish(): Promise<{
  fishId: string;
  startedAt: number;
  growthValue: number;
  growthStage: number;
  lastFedAt?: number;
  feedCount?: number;
} | null> {
  if (typeof window === "undefined") return null;
  const record = await getFishRecord();
  if (!record) return null;
  record.growthValue = computeGrowthValue(record);
  await saveFish(record);
  return {
    fishId: record.fishId,
    startedAt: record.startedAt,
    growthValue: record.growthValue,
    growthStage: growthValueToStage(record.growthValue),
    lastFedAt: record.lastFedAt,
    feedCount: record.feedCount,
  };
}

export async function startFish(fishId: "goldfish"): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const inv = await getInventoryState();
  if (!inv.hasFishTank) return { success: false, message: "需要先購買魚缸" };
  const existing = await getFishRecord();
  if (existing) return { success: false, message: "已經在養魚中" };

  if (fishId === "goldfish") {
    if ((inv.goldfishEgg ?? 0) < 1) return { success: false, message: "需要金魚卵，請到商店購買" };
    const used = await useGoldfishEgg();
    if (!used) return { success: false, message: "金魚卵不足" };
  }

  const record: FishRecord = {
    id: FISH_KEY,
    fishId,
    growthValue: 0,
    startedAt: Date.now(),
    feedCount: 0,
  };
  await saveFish(record);
  return { success: true };
}

export async function feedFish(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getFishRecord();
  if (!record) return { success: false, message: "尚未開始養魚" };

  const used = await useFishFood();
  if (!used) return { success: false, message: "沒有魚飼料罐，請到商店購買" };

  record.growthValue = computeGrowthValue(record);
  record.growthValue = Math.min(5, record.growthValue + GROWTH_PER_FEED);
  record.lastFedAt = Date.now();
  record.feedCount = (record.feedCount ?? 0) + 1;
  await saveFish(record);
  return { success: true };
}

export async function releaseFish(): Promise<{ success: boolean; message?: string; coinsAwarded?: number }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getFishRecord();
  if (!record) return { success: false, message: "尚未開始養魚" };

  const stage = growthValueToStage(computeGrowthValue(record));
  if (stage < FISH_MAX_STAGE) return { success: false, message: "魚還沒長大，再養一下吧" };

  await addCoins(RELEASE_COINS);
  const db = await getDB();
  await db.delete(STORE_FISH, FISH_KEY);
  return { success: true, coinsAwarded: RELEASE_COINS };
}

export async function clearFishWithoutRelease(): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getFishRecord();
  if (!record) return { success: false, message: "尚未養魚" };
  const db = await getDB();
  await db.delete(STORE_FISH, FISH_KEY);
  return { success: true };
}


const FISH_TOOL_GROWTH_BONUS: Record<string, number> = {
  fish_net: 0.04,
  air_pump: 0.08,
  filter: 0.06,
  thermometer: 0.05,
  bucket: 0.07,
};

export async function applyFishTool(toolId: "fish_net" | "air_pump" | "filter" | "thermometer" | "bucket"): Promise<{ success: boolean; message?: string }> {
  if (typeof window === "undefined") return { success: false, message: "僅支援瀏覽器" };
  const record = await getFishRecord();
  if (!record) return { success: false, message: "尚未開始養魚" };

  const used = await useTool(toolId);
  if (!used) return { success: false, message: "道具不足，請到商店購買" };

  record.growthValue = computeGrowthValue(record);
  record.growthValue = Math.min(5, record.growthValue + (FISH_TOOL_GROWTH_BONUS[toolId] ?? 0.05));
  await saveFish(record);
  return { success: true };
}
