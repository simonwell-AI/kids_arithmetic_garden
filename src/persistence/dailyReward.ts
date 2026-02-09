import { incrementTodayProgress } from "./dailyProgress";
import { addFertilizerBasic } from "./inventory";
import { claimDailyRewardIfEligible } from "./wallet";

export async function advanceDailyProgressAndClaimReward(): Promise<{
  completed: number;
  total: number;
  justCompleted?: boolean;
  justStreak7?: boolean;
  reward?: {
    claimed: boolean;
    newCoins: number;
    rewardAmount: number;
    streakBonus: number;
    /** 完成今日任務額外送的一般肥料數量 */
    fertilizerAwarded?: number;
  };
}> {
  const progress = await incrementTodayProgress();
  if (progress.justCompleted) {
    const reward = await claimDailyRewardIfEligible();
    await addFertilizerBasic(1);
    return { ...progress, reward: { ...reward, fertilizerAwarded: 1 } };
  }
  return progress;
}
