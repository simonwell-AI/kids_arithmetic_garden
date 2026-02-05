import { getDB, STORE_SKILL_WEIGHTS, type SkillWeightRecord } from './db';
import type { WeightsMap } from '@/src/adaptive';

export async function getAllWeights(): Promise<WeightsMap> {
  const db = await getDB();
  const list = await db.getAll(STORE_SKILL_WEIGHTS);
  const map: WeightsMap = {};
  for (const r of list) {
    map[r.skillKey] = r.weight;
  }
  return map;
}

export async function saveWeight(skillKey: string, weight: number): Promise<void> {
  const db = await getDB();
  await db.put(STORE_SKILL_WEIGHTS, { skillKey, weight });
}

export async function saveWeights(weightsMap: WeightsMap): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_SKILL_WEIGHTS, 'readwrite');
  for (const [skillKey, weight] of Object.entries(weightsMap)) {
    await tx.store.put({ skillKey, weight });
  }
  await tx.done;
}
