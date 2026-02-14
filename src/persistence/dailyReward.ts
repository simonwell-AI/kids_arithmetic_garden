import {
  incrementTodayProgress,
  MIN_CORRECT_FOR_TODAY_REWARD,
  getStreak,
} from "./dailyProgress";
import { addFertilizerBasic } from "./inventory";
import { claimDailyRewardIfEligible } from "./wallet";
import { checkTodayStreakAchievements } from "./achievements";

export async function advanceDailyProgressAndClaimReward(correct: boolean): Promise<{
  completed: number;
  total: number;
  correctCount: number;
  justCompleted?: boolean;
  justStreak7?: boolean;
  reward?: {
    claimed: boolean;
    newCoins: number;
    rewardAmount: number;
    streakBonus: number;
    /** 完成今日任務額外送的一般肥料數量 */
    fertilizerAwarded?: number;
    /** 答對率未達 70% 故未發獎 */
    thresholdNotMet?: boolean;
  };
}> {
  const progress = await incrementTodayProgress(correct);
  if (progress.justCompleted) {
    const meetsThreshold = progress.correctCount >= MIN_CORRECT_FOR_TODAY_REWARD;
    if (meetsThreshold) {
      const reward = await claimDailyRewardIfEligible();
      await addFertilizerBasic(1);
      const streak = await getStreak();
      const achievementUnlock = await checkTodayStreakAchievements(streak);
      return {
        ...progress,
        reward: {
          ...reward,
          fertilizerAwarded: 1,
          ...(achievementUnlock.coinsAwarded > 0 && { achievementUnlock }),
        },
      };
    }
    return {
      ...progress,
      reward: {
        claimed: false,
        newCoins: 0,
        rewardAmount: 0,
        streakBonus: 0,
        thresholdNotMet: true,
      },
    };
  }
  return progress;
}
