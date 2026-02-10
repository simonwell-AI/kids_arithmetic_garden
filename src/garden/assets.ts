/**
 * 各種子對應的成長圖張數（檔名尾數 _1 ～ _N）。
 * 未列在此的種子預設 5 張（_1.._5）；若資料夾只有 4 張圖則設 4，依此類推。
 */
export const SEED_MAX_FRAME: Record<string, number> = {
  tomato: 4,
};

/** 花園／商店圖片路徑：種子成長階段 0..4 對應 _1.._N（N = SEED_MAX_FRAME[seedId] ?? 5） */
export function getSeedGrowthImagePath(seedId: string, stage: number): string {
  const maxFrame = SEED_MAX_FRAME[seedId] ?? 5;
  const frame = Math.min(maxFrame, Math.max(1, stage + 1));
  return `/garden-assets/${seedId}/${seedId}_${frame}.png`;
}

export function getSeedIconPath(seedId: string): string {
  return `/garden-assets/${seedId}/${seedId}_1.png`;
}

export const SEED_NAMES: Record<string, string> = {
  pink_flower: "粉紅花",
  sun_flower: "向日葵",
  tomato: "番茄",
  rose: "玫瑰花",
  brocoli: "花椰菜",
};
