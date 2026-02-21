const GARGEN_TOOLS_BASE = "/garden-assets/gargen_tools";
const WATERING_CAN_BASE = "/garden-assets/watering_can";
const BACKPACK_BASE = "/garden-assets/Backpack";

export const DEFAULT_BACKPACK_IMAGE = `${BACKPACK_BASE}/green_backpack.png`;

export type ShopItemType =
  | "seed"
  | "water"
  | "fertilizer_basic"
  | "fertilizer_premium"
  | "insecticide"
  | "backpack_expand"
  | "tool"
  | "watering_can"
  | "backpack";

export interface ShopItem {
  id: string;
  type: ShopItemType;
  name: string;
  price: number;
  seedId?: string;
  capacityExpand?: number;
  toolId?: string;
  toolImagePath?: string;
  wateringCanId?: string;
  wateringCanImagePath?: string;
  backpackId?: string;
  backpackImagePath?: string;
}

export const SHOP_CATALOG: ShopItem[] = [
  { id: "seed_pink_flower", type: "seed", name: "粉紅花種子", price: 15, seedId: "pink_flower" },
  { id: "seed_sun_flower", type: "seed", name: "向日葵種子", price: 15, seedId: "sun_flower" },
  { id: "seed_tomato", type: "seed", name: "番茄種子", price: 18, seedId: "tomato" },
  { id: "seed_rose", type: "seed", name: "玫瑰花種子", price: 22, seedId: "rose" },
  { id: "seed_brocoli", type: "seed", name: "花椰菜種子", price: 25, seedId: "brocoli" },
  { id: "seed_tulip", type: "seed", name: "鬱金香種子", price: 25, seedId: "tulip" },
  { id: "seed_lavender", type: "seed", name: "薰衣草種子", price: 28, seedId: "Lavender" },
  { id: "seed_daffodils", type: "seed", name: "水仙花種子", price: 26, seedId: "daffodils" },
  { id: "seed_peach", type: "seed", name: "水蜜桃種子", price: 28, seedId: "peach" },
  { id: "water", type: "water", name: "水", price: 1 },
  { id: "fertilizer_basic", type: "fertilizer_basic", name: "一般肥料", price: 5 },
  { id: "fertilizer_premium", type: "fertilizer_premium", name: "高級肥料", price: 12 },
  { id: "insecticide", type: "insecticide", name: "殺蟲劑", price: 6 },
  { id: "backpack_expand", type: "backpack_expand", name: "擴充背包", price: 20, capacityExpand: 5 },
  { id: "tool_fertilizer_bottle", type: "tool", name: "肥料瓶", price: 8, toolId: "fertilizer_bottle", toolImagePath: `${GARGEN_TOOLS_BASE}/Fertilizer Bottle.png` },
  { id: "tool_garden_fork", type: "tool", name: "園藝叉", price: 8, toolId: "garden_fork", toolImagePath: `${GARGEN_TOOLS_BASE}/Garden Fork.png` },
  { id: "tool_garden_scissors", type: "tool", name: "園藝剪刀", price: 8, toolId: "garden_scissors", toolImagePath: `${GARGEN_TOOLS_BASE}/Garden Scissors.png` },
  { id: "tool_garden_trowel", type: "tool", name: "園藝鏟", price: 8, toolId: "garden_trowel", toolImagePath: `${GARGEN_TOOLS_BASE}/Garden Trowel.png` },
  { id: "tool_plant_mister", type: "tool", name: "噴霧器", price: 8, toolId: "plant_mister", toolImagePath: `${GARGEN_TOOLS_BASE}/Plant Mister.png` },
  { id: "tool_potting_soil", type: "tool", name: "盆栽土", price: 8, toolId: "potting_soil", toolImagePath: `${GARGEN_TOOLS_BASE}/Potting Soil.png` },
  { id: "watering_can_blue", type: "watering_can", name: "藍色水壺", price: 6, wateringCanId: "blue", wateringCanImagePath: `${WATERING_CAN_BASE}/watering-can_blue.png` },
  { id: "watering_can_green", type: "watering_can", name: "綠色水壺", price: 6, wateringCanId: "green", wateringCanImagePath: `${WATERING_CAN_BASE}/watering-can_green.png` },
  { id: "watering_can_red", type: "watering_can", name: "紅色水壺", price: 6, wateringCanId: "red", wateringCanImagePath: `${WATERING_CAN_BASE}/watering-can_red.png` },
  { id: "watering_can_yellow", type: "watering_can", name: "黃色水壺", price: 6, wateringCanId: "yellow", wateringCanImagePath: `${WATERING_CAN_BASE}/watering-can_yellow.png` },
  { id: "backpack_classic", type: "backpack", name: "經典背包", price: 25, backpackId: "classic_backpack", backpackImagePath: `${BACKPACK_BASE}/classic_backpack.png` },
  { id: "backpack_cute_bear", type: "backpack", name: "可愛熊背包", price: 25, backpackId: "cute_bear_backpack", backpackImagePath: `${BACKPACK_BASE}/cute_bear_backpack.png` },
];

/** 分類與對應類型，用於分區顯示 */
export const SHOP_CATEGORIES: { key: string; label: string; types: ShopItemType[] }[] = [
  { key: "seed", label: "種子", types: ["seed"] },
  { key: "consumable", label: "消耗品", types: ["water", "fertilizer_basic", "fertilizer_premium", "insecticide"] },
  { key: "tool", label: "園藝工具", types: ["tool"] },
  { key: "watering_can", label: "水壺外觀", types: ["watering_can"] },
  { key: "backpack", label: "背包", types: ["backpack_expand", "backpack"] },
];
