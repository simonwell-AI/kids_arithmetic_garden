import { getDB, STORE_INVENTORY, INVENTORY_KEY, type InventoryRecord } from "./db";

async function getInventory(): Promise<InventoryRecord> {
  const db = await getDB();
  const record = (await db.get(STORE_INVENTORY, INVENTORY_KEY)) as InventoryRecord | undefined;
  if (record) return normalizeInv(record);
  const defaultRecord: InventoryRecord = {
    id: INVENTORY_KEY,
    water: 0,
    fertilizerBasic: 0,
    fertilizerPremium: 0,
    seeds: { pink_flower: 1 },
    tools: {},
    wateringCans: {},
    backpacks: {},
    capacity: 5,
  };
  await db.put(STORE_INVENTORY, defaultRecord);
  return defaultRecord;
}

function normalizeInv(record: InventoryRecord): InventoryRecord {
  return {
    ...record,
    tools: record.tools ?? {},
    wateringCans: record.wateringCans ?? {},
    backpacks: record.backpacks ?? {},
    capacity: record.capacity ?? 5,
  };
}

export async function getInventoryState(): Promise<InventoryRecord> {
  if (typeof window === "undefined") {
    return {
      id: INVENTORY_KEY,
      water: 0,
      fertilizerBasic: 0,
      fertilizerPremium: 0,
      seeds: {},
      tools: {},
      wateringCans: {},
      backpacks: {},
      capacity: 5,
    };
  }
  const inv = await getInventory();
  return normalizeInv(inv);
}

function sumCounts(r: Record<string, number>): number {
  return Object.values(r).reduce((a, b) => a + b, 0);
}

export function totalItemCount(inv: InventoryRecord): number {
  const invN = normalizeInv(inv);
  const seedCount = sumCounts(invN.seeds);
  const toolCount = sumCounts(invN.tools ?? {});
  const wateringCanCount = sumCounts(invN.wateringCans ?? {});
  const backpackCount = sumCounts(invN.backpacks ?? {});
  return invN.water + invN.fertilizerBasic + invN.fertilizerPremium + seedCount + toolCount + wateringCanCount + backpackCount;
}

export async function addTool(toolId: string, count: number): Promise<void> {
  if (typeof window === "undefined") return;
  const inv = normalizeInv(await getInventory());
  inv.tools = { ...(inv.tools ?? {}) };
  inv.tools[toolId] = Math.max(0, (inv.tools[toolId] ?? 0) + count);
  await (await getDB()).put(STORE_INVENTORY, inv);
}

export async function hasTool(toolId: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const inv = normalizeInv(await getInventory());
  return (inv.tools?.[toolId] ?? 0) > 0;
}

export async function addWateringCan(wateringCanId: string, count: number): Promise<void> {
  if (typeof window === "undefined") return;
  const inv = normalizeInv(await getInventory());
  inv.wateringCans = { ...(inv.wateringCans ?? {}) };
  inv.wateringCans[wateringCanId] = Math.max(0, (inv.wateringCans[wateringCanId] ?? 0) + count);
  await (await getDB()).put(STORE_INVENTORY, inv);
}

export async function addBackpack(backpackId: string, count: number): Promise<void> {
  if (typeof window === "undefined") return;
  const inv = normalizeInv(await getInventory());
  inv.backpacks = { ...(inv.backpacks ?? {}) };
  inv.backpacks[backpackId] = Math.max(0, (inv.backpacks[backpackId] ?? 0) + count);
  await (await getDB()).put(STORE_INVENTORY, inv);
}

export async function expandCapacity(by: number): Promise<void> {
  if (typeof window === "undefined") return;
  const inv = normalizeInv(await getInventory());
  inv.capacity = Math.max(inv.capacity ?? 5, (inv.capacity ?? 5) + by);
  await (await getDB()).put(STORE_INVENTORY, inv);
}

export async function setSelectedBackpack(backpackId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const inv = normalizeInv(await getInventory());
  inv.selectedBackpackId = backpackId;
  await (await getDB()).put(STORE_INVENTORY, inv);
}

export async function addWater(count: number): Promise<void> {
  if (typeof window === "undefined") return;
  const inv = await getInventory();
  inv.water = Math.max(0, inv.water + count);
  await (await getDB()).put(STORE_INVENTORY, inv);
}

export async function addFertilizerBasic(count: number): Promise<void> {
  if (typeof window === "undefined") return;
  const inv = await getInventory();
  inv.fertilizerBasic = Math.max(0, inv.fertilizerBasic + count);
  await (await getDB()).put(STORE_INVENTORY, inv);
}

export async function addFertilizerPremium(count: number): Promise<void> {
  if (typeof window === "undefined") return;
  const inv = await getInventory();
  inv.fertilizerPremium = Math.max(0, inv.fertilizerPremium + count);
  await (await getDB()).put(STORE_INVENTORY, inv);
}

export async function addSeed(seedId: string, count: number): Promise<void> {
  if (typeof window === "undefined") return;
  const inv = await getInventory();
  inv.seeds = { ...inv.seeds };
  inv.seeds[seedId] = Math.max(0, (inv.seeds[seedId] ?? 0) + count);
  await (await getDB()).put(STORE_INVENTORY, inv);
}

export async function useWater(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const inv = await getInventory();
  if (inv.water < 1) return false;
  inv.water -= 1;
  await (await getDB()).put(STORE_INVENTORY, inv);
  return true;
}

export async function useFertilizerBasic(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const inv = await getInventory();
  if (inv.fertilizerBasic < 1) return false;
  inv.fertilizerBasic -= 1;
  await (await getDB()).put(STORE_INVENTORY, inv);
  return true;
}

export async function useFertilizerPremium(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const inv = await getInventory();
  if (inv.fertilizerPremium < 1) return false;
  inv.fertilizerPremium -= 1;
  await (await getDB()).put(STORE_INVENTORY, inv);
  return true;
}

export async function useSeed(seedId: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const inv = await getInventory();
  const n = inv.seeds[seedId] ?? 0;
  if (n < 1) return false;
  inv.seeds = { ...inv.seeds };
  inv.seeds[seedId] = n - 1;
  if (inv.seeds[seedId] === 0) delete inv.seeds[seedId];
  await (await getDB()).put(STORE_INVENTORY, inv);
  return true;
}
