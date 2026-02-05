/** 可替換的 random，供「今日題組」用日期 seed 產生固定序列 */
let _random: () => number = () => Math.random();

export function getRandom(): number {
  return _random();
}

export function setRandom(fn: () => number): void {
  _random = fn;
}

export function resetRandom(): void {
  _random = () => Math.random();
}

/** 將字串 hash 成數字 seed（djb2） */
export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** Mulberry32 產生 0..1，同一 seed 得到同一序列 */
export function createSeededRandom(seed: number): () => number {
  return function seeded() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    const t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}
