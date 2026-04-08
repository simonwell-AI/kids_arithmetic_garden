"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { getFish, startFish, feedFish, releaseFish, clearFishWithoutRelease, applyFishTool } from "@/src/persistence/fish";
import {
  getAchievements,
  recordFishVisit,
  recordFirstFishStart,
  incrementFishFeedCount,
  incrementFishReleaseCount,
  incrementFishToolUseCount,
  type AchievementState,
} from "@/src/persistence/achievements";
import { getInventoryState } from "@/src/persistence/inventory";
import { unlockAudio, playSparkleSound, playCelebrationSound } from "@/src/lib/sound";

const FISH_BASE = "/fish_tank-assets";
const GOLDFISH_BASE = `${FISH_BASE}/goldfish`;
const FISH_TANK_IMAGE = `${FISH_BASE}/fish_tank.png`;
const FISH_FOOD_IMAGE = `${FISH_BASE}/fish_food.png`;
const FISH_NET_IMAGE = `${FISH_BASE}/fish_net.png`;
const FISH_AIR_PUMP_IMAGE = `${FISH_BASE}/air_pump.png`;
const FISH_FILTER_IMAGE = `${FISH_BASE}/water_filter.png`;
const FISH_THERMOMETER_IMAGE = `${FISH_BASE}/thermometer.png`;
const FISH_BUCKET_IMAGE = `${FISH_BASE}/bucket.png`;

const FEED_ANIMATION_MS = 1400;

const STAGE_NAMES: Record<number, string> = {
  1: "魚卵",
  2: "小幼魚",
  3: "成長中",
  4: "青年魚",
  5: "成魚",
};

type FishAnimating = "feed" | "net" | "pump" | "filter" | "thermometer" | "bucket" | null;

export default function FishPage() {
  const [fish, setFish] = useState<Awaited<ReturnType<typeof getFish>>>(null);
  const [inventory, setInventory] = useState<Awaited<ReturnType<typeof getInventoryState>> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [animating, setAnimating] = useState<FishAnimating>(null);
  const [showReleaseCelebration, setShowReleaseCelebration] = useState(false);
  const [showChangeFishConfirm, setShowChangeFishConfirm] = useState(false);
  const [achievements, setAchievements] = useState<AchievementState | null>(null);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2400);
  };

  const load = useCallback(async () => {
    try {
      const [f, inv] = await Promise.all([getFish(), getInventoryState()]);
      setFish(f);
      setInventory(inv);
      const a1 = await getAchievements();
      setAchievements(a1);
      await recordFishVisit();
      const a2 = await getAchievements();
      setAchievements(a2);
    } catch {
      setFish(null);
      setInventory(null);
      setAchievements(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = useCallback(async () => {
    const result = await startFish("goldfish");
    if (result.success) {
      const badgeResult = await recordFirstFishStart();
      const totalCoins = badgeResult.coinsAwarded ?? 0;
      showMessage(totalCoins > 0 ? `開始養金魚～ 成就 +${totalCoins} 代幣` : "開始養金魚～");
      load();
    } else {
      showMessage(result.message ?? "無法開始養魚");
    }
  }, [load]);

  const handleFeed = useCallback(async () => {
    unlockAudio();
    const result = await feedFish();
    if (!result.success) {
      showMessage(result.message ?? "餵食失敗");
      return;
    }
    const badgeResult = await incrementFishFeedCount();
    const badgeCoins = badgeResult.coinsAwarded ?? 0;
    setAnimating("feed");
    const soundMs = await playSparkleSound();
    showMessage(badgeCoins > 0 ? `餵魚成功～ 成就 +${badgeCoins} 代幣` : "餵魚成功～");
    setTimeout(() => {
      setAnimating(null);
      load();
    }, Math.max(FEED_ANIMATION_MS, typeof soundMs === "number" ? soundMs : 0));
  }, [load]);



  const handleTool = useCallback(
    async (toolId: "fish_net" | "air_pump" | "filter" | "thermometer" | "bucket", anim: Exclude<FishAnimating, "feed" | null>, successMsg: string) => {
      unlockAudio();
      const result = await applyFishTool(toolId);
      if (!result.success) {
        showMessage(result.message ?? "使用道具失敗");
        return;
      }
      const badgeResult = await incrementFishToolUseCount();
      const badgeCoins = badgeResult.coinsAwarded ?? 0;
      setAnimating(anim);
      const soundMs = await playSparkleSound();
      showMessage(badgeCoins > 0 ? `${successMsg} 成就 +${badgeCoins} 代幣` : successMsg);
      setTimeout(() => {
        setAnimating(null);
        load();
      }, Math.max(1400, typeof soundMs === "number" ? soundMs : 0));
    },
    [load]
  );

  const handleRelease = useCallback(async () => {
    unlockAudio();
    const result = await releaseFish();
    if (!result.success) {
      showMessage(result.message ?? "放回魚池失敗");
      return;
    }
    const badgeResult = await incrementFishReleaseCount();
    const totalCoins = (result.coinsAwarded ?? 0) + (badgeResult.coinsAwarded ?? 0);
    playCelebrationSound();
    setShowReleaseCelebration(true);
    showMessage(`放回魚池成功！獲得 ${totalCoins} 代幣`);
    setTimeout(() => {
      setShowReleaseCelebration(false);
      load();
    }, 1700);
  }, [load]);

  const handleChangeFish = useCallback(async () => {
    const clearResult = await clearFishWithoutRelease();
    if (!clearResult.success) {
      showMessage(clearResult.message ?? "變更失敗");
      return;
    }
    const startResult = await startFish("goldfish");
    if (startResult.success) {
      setShowChangeFishConfirm(false);
      showMessage("已重新放入金魚卵～");
      load();
    } else {
      showMessage(startResult.message ?? "變更失敗");
    }
  }, [load]);

  const hasFishTank = inventory?.hasFishTank ?? false;
  const goldfishEggCount = inventory?.goldfishEgg ?? 0;
  const fishFoodCount = inventory?.fishFood ?? 0;
  const fishNetCount = inventory?.tools?.fish_net ?? 0;
  const airPumpCount = inventory?.tools?.air_pump ?? 0;
  const filterCount = inventory?.tools?.filter ?? 0;
  const thermometerCount = inventory?.tools?.thermometer ?? 0;
  const bucketCount = inventory?.tools?.bucket ?? 0;
  const canStart = hasFishTank && !fish && goldfishEggCount > 0;
  const isAdult = fish != null && fish.growthStage >= 5;
  const fishSwimDurationSec =
    fish == null
      ? 4.2
      : fish.growthStage <= 2
        ? 3.1
        : fish.growthStage === 3
          ? 3.8
          : fish.growthStage === 4
            ? 4.6
            : 5.4;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-sky-200/80 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
        <Link href="/" className="text-sm font-medium text-sky-700 hover:underline">
          ← 回首頁
        </Link>
        <h1 className="text-lg font-bold text-[var(--foreground)] sm:text-xl">🐟 魚缸</h1>
        <Link href="/shop?from=fish" className="text-sm font-medium text-sky-700 hover:underline">
          商店
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-6 sm:px-6 sm:py-8">
        {message && (
          <p className="mb-4 w-full max-w-md rounded-xl bg-sky-100 px-4 py-2 text-center text-sm font-semibold text-sky-800" role="status">
            {message}
          </p>
        )}

        {showReleaseCelebration && (
          <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-sky-200/40">
            <div className="rounded-2xl bg-sky-100 px-8 py-6 text-center text-xl font-bold text-sky-900 shadow-lg">🎉 放回魚池成功！獲得代幣</div>
          </div>
        )}

        {!hasFishTank && (
          <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-sky-200 bg-sky-50/80 p-6 text-center">
            <Image src={FISH_TANK_IMAGE} alt="魚缸" width={220} height={160} className="rounded-lg object-contain" unoptimized />
            <p className="text-gray-700">還沒有魚缸喔！請先到商店購買魚缸。</p>
            <Link href="/shop?from=fish" className="min-h-[48px] rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700">
              前往商店
            </Link>
          </div>
        )}

        {hasFishTank && !fish && (
          <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-sky-200 bg-sky-50/80 p-6 text-center">
            <Image src={FISH_TANK_IMAGE} alt="魚缸" width={220} height={160} className="rounded-lg object-contain" unoptimized />
            {goldfishEggCount < 1 ? (
              <>
                <p className="text-gray-700">魚缸是空的～請到商店購買「金魚卵」後開始養魚。</p>
                <Link href="/shop?from=fish" className="min-h-[48px] rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700">
                  前往商店
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                className="min-h-[48px] rounded-2xl bg-sky-600 px-6 font-bold text-white shadow-sm disabled:opacity-50 hover:bg-sky-700 active:scale-[0.98]"
              >
                🐣 放入金魚卵（× {goldfishEggCount}）
              </button>
            )}
          </div>
        )}

        {hasFishTank && fish && (
          <div className="w-full max-w-md rounded-2xl border-2 border-sky-200 bg-sky-50/80 p-4 shadow-md">
            <div className="relative overflow-hidden rounded-2xl border border-sky-200 bg-white/80">
              <div className="relative aspect-[4/3] min-h-[240px]">
                <Image src={FISH_TANK_IMAGE} alt="魚缸" fill className="object-cover" unoptimized />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <Image
                    src={`${GOLDFISH_BASE}/goldfish_${fish.growthStage}.png`}
                    alt={`金魚 階段 ${fish.growthStage}`}
                    width={150}
                    height={120}
                    className="fish-swim-idle object-contain"
                    style={{ ["--fish-swim-duration" as string]: `${fishSwimDurationSec}s` }}
                    unoptimized
                  />
                </div>
                {animating === "feed" && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    <Image src={FISH_FOOD_IMAGE} alt="" width={128} height={128} className="fish-tool-swing object-contain" unoptimized />
                    <span className="fish-sparkle absolute left-1/2 top-1/3 h-4 w-4 rounded-full bg-amber-300/80" aria-hidden />
                  </div>
                )}
                {animating === "net" && (
                  <div className="pointer-events-none absolute inset-0 z-20">
                    <Image src={FISH_NET_IMAGE} alt="" width={184} height={184} className="fish-net-sweep absolute left-1/2 top-1/2 object-contain" unoptimized />
                  </div>
                )}
                {animating === "pump" && (
                  <div className="pointer-events-none absolute inset-0 z-20">
                    <Image src={FISH_AIR_PUMP_IMAGE} alt="" width={144} height={144} className="fish-tool-swing absolute right-4 top-4 object-contain" unoptimized />
                    <span className="fish-bubble-dot absolute left-[45%] top-[60%] h-3 w-3 rounded-full bg-sky-200/80" />
                    <span className="fish-bubble-dot absolute left-[52%] top-[66%] h-2 w-2 rounded-full bg-sky-100/90" style={{ animationDelay: "0.2s" }} />
                    <span className="fish-bubble-dot absolute left-[58%] top-[70%] h-3 w-3 rounded-full bg-sky-200/70" style={{ animationDelay: "0.35s" }} />
                  </div>
                )}
                {animating === "filter" && (
                  <div className="pointer-events-none absolute inset-0 z-20">
                    <Image src={FISH_FILTER_IMAGE} alt="" width={160} height={160} className="fish-tool-swing absolute left-3 top-3 object-contain opacity-90" unoptimized />
                    <span className="fish-ripple absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/70" />
                    <span className="fish-ripple absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/60" style={{ animationDelay: "0.2s" }} />
                  </div>
                )}
                {animating === "thermometer" && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    <Image src={FISH_THERMOMETER_IMAGE} alt="" width={144} height={144} className="fish-thermo-pulse object-contain" unoptimized />
                  </div>
                )}
                {animating === "bucket" && (
                  <div className="pointer-events-none absolute inset-0 z-20">
                    <Image src={FISH_BUCKET_IMAGE} alt="" width={156} height={156} className="fish-tool-swing absolute right-5 top-6 object-contain" unoptimized />
                    <span className="fish-bucket-drop absolute right-[30%] top-[35%] h-2.5 w-2.5 rounded-full bg-sky-300/80" />
                    <span className="fish-bucket-drop absolute right-[34%] top-[38%] h-2 w-2 rounded-full bg-sky-200/80" style={{ animationDelay: "0.15s" }} />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {!isAdult && (
                <button
                  type="button"
                  onClick={handleFeed}
                  disabled={animating !== null || fishFoodCount < 1}
                  className="min-h-[48px] rounded-2xl bg-emerald-600 px-6 font-bold text-white shadow-sm disabled:opacity-50 hover:bg-emerald-700 active:scale-[0.98]"
                >
                  🍽️ 餵魚（魚飼料罐 × {fishFoodCount}）
                </button>
              )}
              <button
                type="button"
                onClick={() => handleTool("fish_net", "net", "用小魚網整理完成～")}
                disabled={animating !== null || fishNetCount < 1}
                className="min-h-[48px] rounded-2xl bg-cyan-600 px-6 font-bold text-white shadow-sm disabled:opacity-50 hover:bg-cyan-700 active:scale-[0.98]"
              >
                🕸️ 小魚網（× {fishNetCount}）
              </button>
              <button
                type="button"
                onClick={() => handleTool("air_pump", "pump", "打氣完成，水中含氧提升～")}
                disabled={animating !== null || airPumpCount < 1}
                className="min-h-[48px] rounded-2xl bg-sky-600 px-6 font-bold text-white shadow-sm disabled:opacity-50 hover:bg-sky-700 active:scale-[0.98]"
              >
                💨 打氣機（× {airPumpCount}）
              </button>
              <button
                type="button"
                onClick={() => handleTool("filter", "filter", "過濾完成，水質更乾淨～")}
                disabled={animating !== null || filterCount < 1}
                className="min-h-[48px] rounded-2xl bg-indigo-600 px-6 font-bold text-white shadow-sm disabled:opacity-50 hover:bg-indigo-700 active:scale-[0.98]"
              >
                🧪 過濾器（× {filterCount}）
              </button>
              <button
                type="button"
                onClick={() => handleTool("thermometer", "thermometer", "量測水溫完成～")}
                disabled={animating !== null || thermometerCount < 1}
                className="min-h-[48px] rounded-2xl bg-rose-600 px-6 font-bold text-white shadow-sm disabled:opacity-50 hover:bg-rose-700 active:scale-[0.98]"
              >
                🌡️ 水溫計（× {thermometerCount}）
              </button>
              <button
                type="button"
                onClick={() => handleTool("bucket", "bucket", "換水完成，魚魚更舒服～")}
                disabled={animating !== null || bucketCount < 1}
                className="min-h-[48px] rounded-2xl bg-teal-600 px-6 font-bold text-white shadow-sm disabled:opacity-50 hover:bg-teal-700 active:scale-[0.98]"
              >
                🪣 換水桶（× {bucketCount}）
              </button>
              {isAdult && (
                <button
                  type="button"
                  onClick={handleRelease}
                  disabled={animating !== null}
                  className="min-h-[48px] rounded-2xl bg-sky-600 px-6 font-bold text-white shadow-sm disabled:opacity-50 hover:bg-sky-700 active:scale-[0.98]"
                >
                  🐟 放回魚池（獲得代幣）
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowChangeFishConfirm(true)}
                disabled={animating !== null}
                className="min-h-[48px] rounded-2xl border-2 border-sky-300 bg-sky-50 px-6 font-bold text-sky-800 shadow-sm disabled:opacity-50 hover:bg-sky-100 active:scale-[0.98]"
              >
                🔄 重新放魚
              </button>
            </div>

            <p className="mt-3 text-center text-sm text-gray-600">
              成長階段：{STAGE_NAMES[fish.growthStage] ?? "?"}（{fish.growthStage}/5）
              {fish.feedCount != null && fish.feedCount > 0 && ` · 餵魚 ${fish.feedCount} 次`}
            </p>
          </div>
        )}

        {showChangeFishConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && setShowChangeFishConfirm(false)}>
            <div className="w-full max-w-sm rounded-3xl border-2 border-sky-200 bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-center text-lg font-bold text-[var(--foreground)]">🔄 重新放魚</h2>
              <p className="text-center text-sm text-gray-600">確定要清空目前魚缸並重新放入金魚卵嗎？目前的魚會消失喔。</p>
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => setShowChangeFishConfirm(false)} className="flex-1 rounded-xl border-2 border-gray-300 bg-gray-100 py-2 font-semibold text-gray-700 hover:bg-gray-200">
                  取消
                </button>
                <button type="button" onClick={handleChangeFish} className="flex-1 rounded-xl bg-sky-600 py-2 font-semibold text-white hover:bg-sky-700">
                  確定
                </button>
              </div>
            </div>
          </div>
        )}

        {achievements && (
          <section className="mt-8 w-full max-w-md rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-4 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-amber-900">🏅 魚缸成就徽章</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>{achievements.fishFirstStartUnlocked ? "✅" : "⬜"} 🐣 第一次養魚</p>
              <p>{achievements.fishStreak7Unlocked ? "✅" : "⬜"} 📅 連續 7 天進魚缸（{Math.min(achievements.fishConsecutiveDays, 7)}/7）</p>
              <p>{achievements.fishFeed10Unlocked ? "✅" : "⬜"} 🍽️ 餵魚 10 次（{Math.min(achievements.fishFeedCount, 10)}/10）</p>
              <p>{achievements.fishRelease1Unlocked ? "✅" : "⬜"} 🐟 第一次放回魚池（{Math.min(achievements.fishReleaseCount, 1)}/1）</p>
              <p>{achievements.fishRelease3Unlocked ? "✅" : "⬜"} 🌊 放回魚池 3 次（{Math.min(achievements.fishReleaseCount, 3)}/3）</p>
              <p>{achievements.fishToolUse10Unlocked ? "✅" : "⬜"} 🧰 使用魚缸工具 10 次（{Math.min(achievements.fishToolUseCount, 10)}/10）</p>
            </div>
            <p className="mt-3 text-xs text-amber-800">解鎖成就可獲得 2 代幣，持續照顧魚魚吧！</p>
          </section>
        )}
      </main>
    </div>
  );
}
