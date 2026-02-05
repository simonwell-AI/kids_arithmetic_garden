import { getCoins, addCoins } from "@/src/persistence/wallet";
import {
  addWater,
  addFertilizerBasic,
  addFertilizerPremium,
  addSeed,
  addTool,
  addWateringCan,
  addBackpack,
  expandCapacity,
  getInventoryState,
  totalItemCount,
} from "@/src/persistence/inventory";
import type { ShopItem } from "./catalog";

export async function purchaseItem(item: ShopItem): Promise<{ success: boolean; message?: string }> {
  const coins = await getCoins();
  if (coins < item.price) return { success: false, message: "代幣不足" };
  const inv = await getInventoryState();
  const used = totalItemCount(inv);
  const capacity = inv.capacity ?? 5;
  if (item.type !== "backpack_expand" && used >= capacity) {
    return { success: false, message: "背包已滿，請先擴充背包" };
  }
  await addCoins(-item.price);
  switch (item.type) {
    case "water":
      await addWater(1);
      return { success: true };
    case "fertilizer_basic":
      await addFertilizerBasic(1);
      return { success: true };
    case "fertilizer_premium":
      await addFertilizerPremium(1);
      return { success: true };
    case "seed":
      if (item.seedId) {
        await addSeed(item.seedId, 1);
        return { success: true };
      }
      return { success: false, message: "無此種子" };
    case "backpack_expand":
      await expandCapacity(item.capacityExpand ?? 5);
      return { success: true };
    case "tool":
      if (item.toolId) {
        await addTool(item.toolId, 1);
        return { success: true };
      }
      return { success: false, message: "無此工具" };
    case "watering_can":
      if (item.wateringCanId) {
        await addWateringCan(item.wateringCanId, 1);
        return { success: true };
      }
      return { success: false, message: "無此水壺" };
    case "backpack":
      if (item.backpackId) {
        await addBackpack(item.backpackId, 1);
        return { success: true };
      }
      return { success: false, message: "無此背包" };
    default:
      return { success: false, message: "無法購買" };
  }
}

export async function getInventoryCounts(): Promise<{
  water: number;
  fertilizerBasic: number;
  fertilizerPremium: number;
  seeds: Record<string, number>;
  tools: Record<string, number>;
  wateringCans: Record<string, number>;
  backpacks: Record<string, number>;
  selectedBackpackId?: string;
  used: number;
  capacity: number;
}> {
  const inv = await getInventoryState();
  const used = totalItemCount(inv);
  const capacity = inv.capacity ?? 5;
  return {
    water: inv.water,
    fertilizerBasic: inv.fertilizerBasic,
    fertilizerPremium: inv.fertilizerPremium,
    seeds: inv.seeds ?? {},
    tools: inv.tools ?? {},
    wateringCans: inv.wateringCans ?? {},
    backpacks: inv.backpacks ?? {},
    selectedBackpackId: inv.selectedBackpackId,
    used,
    capacity,
  };
}

export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  fertilizer_bottle: "肥料瓶",
  garden_fork: "園藝叉",
  garden_scissors: "園藝剪刀",
  garden_trowel: "園藝鏟",
  plant_mister: "噴霧器",
  potting_soil: "盆栽土",
};

export const WATERING_CAN_DISPLAY_NAMES: Record<string, string> = {
  blue: "藍色水壺",
  green: "綠色水壺",
  red: "紅色水壺",
  yellow: "黃色水壺",
};

export const BACKPACK_DISPLAY_NAMES: Record<string, string> = {
  classic_backpack: "經典背包",
  cute_bear_backpack: "可愛熊背包",
};
