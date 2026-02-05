export interface WeightUpdateInput {
  correct: boolean;
  responseTimeMs: number;
}

export type WeightsMap = Record<string, number>;

/** Threshold in ms: above = slow (weight +1), below = fast (weight -1). */
export const SLOW_RESPONSE_MS = 5000;

/** Delta for wrong answer. */
export const WRONG_DELTA = 3;
/** Delta for slow correct. */
export const SLOW_CORRECT_DELTA = 1;
/** Delta for fast correct (negative). */
export const FAST_CORRECT_DELTA = -1;
export const MIN_WEIGHT = 0;
