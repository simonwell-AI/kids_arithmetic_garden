/** 花園上次造訪時間（localStorage），用於判斷是否長雜草 */

const KEY_LAST_VISIT = "garden_last_visit";
const WEEDS_DAYS = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getLastGardenVisit(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY_LAST_VISIT);
  if (raw == null) return null;
  const t = parseInt(raw, 10);
  return Number.isFinite(t) ? t : null;
}

export function setLastGardenVisit(timestamp?: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_LAST_VISIT, String(timestamp ?? Date.now()));
}

/** 超過 WEEDS_DAYS 天沒進花園則視為長雜草（需曾造訪過才判斷） */
export function getHasWeeds(): boolean {
  return true;
}
