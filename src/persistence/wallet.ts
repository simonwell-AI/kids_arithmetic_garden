import { getDB, STORE_WALLET, WALLET_KEY, type WalletRecord } from "./db";
import { getStreak } from "./dailyProgress";

/** 今日任務完成代幣（較多） */
const DAILY_REWARD_COINS = 25;
/** 連續 7 天完成今日任務的額外代幣 */
const STREAK_7_BONUS_COINS = 25;
/** 練習／速度測驗答對 80% 以上完成時發放的代幣 */
const COMPLETION_REWARD_COINS = 2;
/** 答對率門檻（含）才發放完成獎勵 */
const COMPLETION_REWARD_THRESHOLD = 0.8;

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function getWallet(): Promise<WalletRecord> {
  const db = await getDB();
  const record = (await db.get(STORE_WALLET, WALLET_KEY)) as WalletRecord | undefined;
  if (record) return record;
  const defaultRecord: WalletRecord = { id: WALLET_KEY, coins: 10 };
  await db.put(STORE_WALLET, defaultRecord);
  return defaultRecord;
}

export async function getCoins(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const w = await getWallet();
  return w.coins;
}

export async function setCoins(coins: number): Promise<void> {
  if (typeof window === "undefined") return;
  const w = await getWallet();
  await (await getDB()).put(STORE_WALLET, { ...w, coins: Math.max(0, coins) });
}

export async function addCoins(amount: number): Promise<number> {
  if (typeof window === "undefined") return 0;
  const w = await getWallet();
  const next = Math.max(0, w.coins + amount);
  await (await getDB()).put(STORE_WALLET, { ...w, coins: next });
  return next;
}

/** 練習或速度測驗完成且答對率 ≥ 80% 時呼叫；發放代幣並回傳 { awarded, amount } */
export async function awardCompletionReward(
  correctCount: number,
  totalCount: number
): Promise<{ awarded: boolean; amount: number }> {
  if (typeof window === "undefined") return { awarded: false, amount: 0 };
  if (totalCount < 1) return { awarded: false, amount: 0 };
  const rate = correctCount / totalCount;
  if (rate < COMPLETION_REWARD_THRESHOLD) return { awarded: false, amount: 0 };
  const next = await addCoins(COMPLETION_REWARD_COINS);
  return { awarded: true, amount: COMPLETION_REWARD_COINS };
}

/** 單一運算速度測驗完成且答對率 ≥ 80% 時呼叫；發放指定代幣並回傳 { awarded, amount } */
export async function awardCustomCompletionReward(
  correctCount: number,
  totalCount: number,
  amount: number
): Promise<{ awarded: boolean; amount: number }> {
  if (typeof window === "undefined") return { awarded: false, amount: 0 };
  if (totalCount < 1 || amount < 1) return { awarded: false, amount: 0 };
  const rate = correctCount / totalCount;
  if (rate < COMPLETION_REWARD_THRESHOLD) return { awarded: false, amount: 0 };
  await addCoins(amount);
  return { awarded: true, amount };
}

/** 今日任務完成時呼叫；若今日尚未領過則發放代幣並回傳 { claimed, newCoins, rewardAmount, streakBonus? } */
export async function claimDailyRewardIfEligible(): Promise<{
  claimed: boolean;
  newCoins: number;
  rewardAmount: number;
  streakBonus: number;
}> {
  if (typeof window === "undefined") return { claimed: false, newCoins: 0, rewardAmount: 0, streakBonus: 0 };
  const today = todayKey();
  const w = await getWallet();
  if (w.lastRewardDate === today) {
    return { claimed: false, newCoins: w.coins, rewardAmount: 0, streakBonus: 0 };
  }
  const streak = await getStreak();
  const streakBonus = streak >= 7 ? STREAK_7_BONUS_COINS : 0;
  const totalReward = DAILY_REWARD_COINS + streakBonus;
  const newCoins = w.coins + totalReward;
  await (await getDB()).put(STORE_WALLET, {
    ...w,
    coins: newCoins,
    lastRewardDate: today,
  });
  return { claimed: true, newCoins, rewardAmount: totalReward, streakBonus };
}
