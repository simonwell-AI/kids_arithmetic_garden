import { getDB, STORE_WALLET, WALLET_KEY, type WalletRecord } from "./db";

const DAILY_REWARD_COINS = 5;

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
  const defaultRecord: WalletRecord = { id: WALLET_KEY, coins: 0 };
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

/** 今日任務完成時呼叫；若今日尚未領過則發放代幣並回傳 { claimed: true, newCoins } */
export async function claimDailyRewardIfEligible(): Promise<{
  claimed: boolean;
  newCoins: number;
  rewardAmount: number;
}> {
  if (typeof window === "undefined") return { claimed: false, newCoins: 0, rewardAmount: 0 };
  const today = todayKey();
  const w = await getWallet();
  if (w.lastRewardDate === today) {
    return { claimed: false, newCoins: w.coins, rewardAmount: 0 };
  }
  const newCoins = w.coins + DAILY_REWARD_COINS;
  await (await getDB()).put(STORE_WALLET, {
    ...w,
    coins: newCoins,
    lastRewardDate: today,
  });
  return { claimed: true, newCoins, rewardAmount: DAILY_REWARD_COINS };
}
