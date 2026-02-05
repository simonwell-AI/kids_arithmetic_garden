/** 花園／商店圖片路徑：種子成長階段 0..4 對應 _1.._5 */
export function getSeedGrowthImagePath(seedId: string, stage: number): string {
  const frame = Math.min(5, Math.max(1, stage + 1));
  return `/garden-assets/${seedId}/${seedId}_${frame}.png`;
}

export function getSeedIconPath(seedId: string): string {
  return `/garden-assets/${seedId}/${seedId}_1.png`;
}

export const SEED_NAMES: Record<string, string> = {
  pink_flower: "粉紅花",
  sun_flower: "向日葵",
};
