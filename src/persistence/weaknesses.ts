import { getDB, STORE_ATTEMPTS, type AttemptRecord } from "./db";

export interface WeaknessItem {
  skillKey: string;
  total: number;
  wrong: number;
  wrongRate: number;
  displayText: string;
}

/** 將 skillKey 轉成簡短顯示（如 add_3_5 → 3＋5） */
function skillKeyToDisplay(skillKey: string): string {
  if (skillKey.startsWith("add_")) {
    const [, a, b] = skillKey.split("_");
    return `${a ?? "?"}＋${b ?? "?"}`;
  }
  if (skillKey.startsWith("sub_")) {
    const [, a, b] = skillKey.split("_");
    return `${a ?? "?"}－${b ?? "?"}`;
  }
  if (skillKey.startsWith("mul_")) {
    const rest = skillKey.slice(4);
    const [a, b] = rest.split("x");
    return `${a ?? "?"}×${b ?? "?"}`;
  }
  if (skillKey.startsWith("div_")) {
    const [, a, b] = skillKey.split("_");
    return `${a ?? "?"}÷${b ?? "?"}`;
  }
  return skillKey;
}

/**
 * 依 attempts 彙總答錯率，回傳常錯題型（依錯題率降序，至少答過 2 題才列入）。
 */
export async function getWeaknessStats(topN = 5): Promise<WeaknessItem[]> {
  if (typeof window === "undefined") return [];
  const db = await getDB();
  const all = (await db.getAll(STORE_ATTEMPTS)) as AttemptRecord[];
  const byKey: Record<string, { total: number; wrong: number }> = {};
  for (const r of all) {
    const k = r.skillKey ?? "";
    if (!byKey[k]) byKey[k] = { total: 0, wrong: 0 };
    byKey[k].total += 1;
    if (!r.correct) byKey[k].wrong += 1;
  }
  const list: WeaknessItem[] = Object.entries(byKey)
    .filter(([, v]) => v.total >= 2 && v.wrong > 0)
    .map(([skillKey, v]) => ({
      skillKey,
      total: v.total,
      wrong: v.wrong,
      wrongRate: v.wrong / v.total,
      displayText: skillKeyToDisplay(skillKey),
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate)
    .slice(0, topN);
  return list;
}
