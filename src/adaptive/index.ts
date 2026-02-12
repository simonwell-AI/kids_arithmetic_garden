import type { WeightsMap } from './types';
import {
  SLOW_RESPONSE_MS,
  WRONG_DELTA,
  SLOW_CORRECT_DELTA,
  FAST_CORRECT_DELTA,
  MIN_WEIGHT,
  getSlowThresholdMs,
} from './types';
import type { Question, GenerateQuestionOptions } from '@/src/generator';
import { generateQuestion, generateQuestionFromSkillKey } from '@/src/generator';

export type { WeightsMap, WeightUpdateInput } from './types';
export { SLOW_RESPONSE_MS } from './types';

/**
 * Compute new weight after an attempt.
 * Wrong: +3, slow correct: +1, fast correct: -1, min 0.
 * thresholdMs 未傳時使用預設 SLOW_RESPONSE_MS。
 */
export function computeNewWeight(
  currentWeight: number,
  correct: boolean,
  responseTimeMs: number,
  thresholdMs: number = SLOW_RESPONSE_MS
): number {
  if (!correct) {
    return currentWeight + WRONG_DELTA;
  }
  if (responseTimeMs > thresholdMs) {
    return currentWeight + SLOW_CORRECT_DELTA;
  }
  return Math.max(MIN_WEIGHT, currentWeight + FAST_CORRECT_DELTA);
}

/**
 * Update a single skill's weight in the map (mutates and returns the map).
 * 依 skillKey 運算類型使用對應的慢速閾值。
 */
export function updateWeight(
  weightsMap: WeightsMap,
  skillKey: string,
  correct: boolean,
  responseTimeMs: number
): WeightsMap {
  const current = weightsMap[skillKey] ?? 0;
  const thresholdMs = getSlowThresholdMs(skillKey);
  weightsMap[skillKey] = computeNewWeight(current, correct, responseTimeMs, thresholdMs);
  return weightsMap;
}

/**
 * Split skill keys into high-weight pool (top 50% by weight) and low-weight pool (rest).
 */
export function splitPools(weightsMap: WeightsMap): { high: string[]; low: string[] } {
  const keys = Object.keys(weightsMap);
  if (keys.length === 0) return { high: [], low: [] };
  const sorted = [...keys].sort((a, b) => (weightsMap[b] ?? 0) - (weightsMap[a] ?? 0));
  const half = Math.max(1, Math.ceil(sorted.length / 2));
  return {
    high: sorted.slice(0, half),
    low: sorted.slice(half),
  };
}

function pick<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Sample one skill key: 80% from high-weight pool, 20% from low-weight pool.
 * If a pool is empty, use the other. If both empty, return undefined.
 */
export function getNextSkillKey(weightsMap: WeightsMap): string | undefined {
  const { high, low } = splitPools(weightsMap);
  if (high.length === 0 && low.length === 0) return undefined;
  if (high.length === 0) return pick(low);
  if (low.length === 0) return pick(high);
  return Math.random() < 0.8 ? pick(high) : pick(low);
}

/**
 * Generate questions using adaptive sampling: 80% from high-weight skills, 20% from low.
 * options must include operation, rangeMax, difficulty; count is number of questions.
 * If weightsMap is empty or skillKey yields no question, falls back to generator.
 */
export function sampleQuestions(
  weightsMap: WeightsMap,
  count: number,
  options: Omit<GenerateQuestionOptions, 'count' | 'skillKey'>
): Question[] {
  const opts = { ...options };
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const skillKey = getNextSkillKey(weightsMap);
    const fromKey = skillKey
      ? generateQuestionFromSkillKey(skillKey, {
          rangeMin: opts.rangeMin,
          rangeMax: opts.rangeMax,
        })
      : null;
    const q = fromKey ?? generateQuestion(opts as GenerateQuestionOptions);
    questions.push(q);
  }
  return questions;
}
