export interface WeightUpdateInput {
  correct: boolean;
  responseTimeMs: number;
}

export type WeightsMap = Record<string, number>;

/** 預設慢速閾值（ms）：超過視為慢，權重 +1 */
export const SLOW_RESPONSE_MS = 5000;

/** 依運算類型之慢速閾值（ms）；乘法、除法給較長時間 */
export const SLOW_RESPONSE_MS_BY_OP: Record<string, number> = {
  add: 5000,
  sub: 5000,
  mul: 6000,
  div: 7000,
};

/** 依 skillKey 取得慢速閾值（skillKey 格式如 add_1_2, mul_3x4） */
export function getSlowThresholdMs(skillKey: string): number {
  const op = skillKey.split("_")[0];
  return SLOW_RESPONSE_MS_BY_OP[op ?? ""] ?? SLOW_RESPONSE_MS;
}

/** Delta for wrong answer. */
export const WRONG_DELTA = 3;
/** Delta for slow correct. */
export const SLOW_CORRECT_DELTA = 1;
/** Delta for fast correct (negative). */
export const FAST_CORRECT_DELTA = -1;
export const MIN_WEIGHT = 0;
