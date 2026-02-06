import { incrementTodayProgress } from "./dailyProgress";
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
  };
}> {
  const progress = await incrementTodayProgress();
  if (progress.justCompleted) {
    const reward = await claimDailyRewardIfEligible();
    return { ...progress, reward };
  }
  return progress;
}
