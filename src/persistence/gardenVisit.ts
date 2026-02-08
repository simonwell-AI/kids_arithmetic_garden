/** 花園上次造訪時間（localStorage），用於判斷是否長雜草 */

const KEY_LAST_VISIT = "garden_last_visit";
/** 剪完或造訪後超過此小時數才視為長雜草 */
const WEEDS_HOURS = 12;
const HOUR_MS = 60 * 60 * 1000;

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

/** 超過 WEEDS_HOURS 小時沒進花園（或沒剪草）則視為長雜草（需曾造訪過才判斷） */
export function getHasWeeds(): boolean {
  const last = getLastGardenVisit();
  if (last == null) return false;
  return Date.now() - last >= WEEDS_HOURS * HOUR_MS;
}
