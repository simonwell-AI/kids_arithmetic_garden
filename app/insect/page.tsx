"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { getInsect, startInsect, feedInsect, releaseInsect, removeMites, cleanWithShovel, cleanWithClips, useGrowthMedicine, clearInsectWithoutRelease, SHOVEL_COOLDOWN_MS, DIRTY_HABITAT_AFTER_MS } from "@/src/persistence/insect";
import { getInventoryState } from "@/src/persistence/inventory";
import { unlockAudio, playSpraySound, playSoilSound, playSparkleSound, playCelebrationSound } from "@/src/lib/sound";

const INSECT_ASSETS = "/insert-assets";
const STAG_BEETLE_BASE = `${INSECT_ASSETS}/stag_beetle`;
const BUTTERFLY_BASE = `${INSECT_ASSETS}/butterfly`;
const HABITAT_EMPTY = `${INSECT_ASSETS}/habitat_empty.png`;
const INSECT_FOOD_IMAGE = `${INSECT_ASSETS}/insect_food.png`;
const MITE_SPRAY_IMAGE = `${INSECT_ASSETS}/mite_spray.png`;
const INSECT_SHOVEL_IMAGE = `${INSECT_ASSETS}/insect_shovel.png`;
const INSECT_CLIPS_IMAGE = `${INSECT_ASSETS}/insect_clips.png`;
const INSECT_POOP_IMAGE = `${INSECT_ASSETS}/insect_poop.png`;
const INSECT_GROWTH_MEDICINE_IMAGE = `${INSECT_ASSETS}/advanced_insect_growth_medicine.png`;
const MITES_IMAGE = `${INSECT_ASSETS}/mites.png`;

const FEED_ANIMATION_MS = 1600;
const SPRAY_ANIMATION_MS = 2400;
const CLEAN_ANIMATION_MS = 1800;
/** 高級昆蟲成長藥動畫時長（與高級肥料一致：3.2 秒） */
const GROWTH_MEDICINE_ANIMATION_MS = 3200;

/** 成長階段對應名稱（與 INSECT_STAG_BEETLE_PLAN 一致） */
const STAGE_NAMES: Record<number, string> = {
  1: "幼蟲",
  2: "成長中",
  3: "成長中",
  4: "蛹",
  5: "成蟲",
};

/** 生病預警顯示閾值：剩餘時間少於此時顯示「再 X 分鐘/小時未清潔會生病」 */
const DIRTY_WARNING_BEFORE_MS = 15 * 60 * 1000; // 15 分鐘

type InsectAnimating = "feed" | "spray" | "clean_shovel" | "clean_clips" | "growth_medicine" | null;

export default function InsectPage() {
  const [insect, setInsect] = useState<Awaited<ReturnType<typeof getInsect>>>(null);
  const [inventory, setInventory] = useState<Awaited<ReturnType<typeof getInventoryState>> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [animating, setAnimating] = useState<InsectAnimating>(null);
  const [showReleaseCelebration, setShowReleaseCelebration] = useState(false);
  const [showChangeInsectModal, setShowChangeInsectModal] = useState(false);
  const [changeInsectSelected, setChangeInsectSelected] = useState<"stag_beetle" | "butterfly" | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const [ins, inv] = await Promise.all([getInsect(), getInventoryState()]);
      setInsect(ins);
      setInventory(inv);
    } catch {
      setInsect(null);
      setInventory(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!insect?.lastShovelUsedAt) return;
    const t = setInterval(() => {
      const current = Date.now();
      const remaining = insect.lastShovelUsedAt != null ? insect.lastShovelUsedAt + SHOVEL_COOLDOWN_MS - current : 0;
      setNow(current);
      if (remaining <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [insect?.lastShovelUsedAt]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2500);
  };

  const formatCooldown = (ms: number) => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const handleStart = useCallback(
    async (insectId: "stag_beetle" | "butterfly") => {
      const result = await startInsect(insectId);
      if (result.success) {
        showMessage(insectId === "butterfly" ? "開始飼養蝴蝶～" : "開始飼養鍬形蟲～");
        load();
      } else {
        showMessage(result.message ?? "無法開始飼養");
      }
    },
    [load]
  );

  const handleChangeInsectConfirm = useCallback(
    async () => {
      if (!changeInsectSelected) return;
      const clearResult = await clearInsectWithoutRelease();
      if (!clearResult.success) {
        showMessage(clearResult.message ?? "清除失敗");
        return;
      }
      const startResult = await startInsect(changeInsectSelected);
      if (startResult.success) {
        showMessage(changeInsectSelected === "butterfly" ? "已改養蝴蝶～" : "已改養鍬形蟲～");
        setShowChangeInsectModal(false);
        setChangeInsectSelected(null);
        load();
      } else {
        showMessage(startResult.message ?? "開始飼養失敗");
      }
    },
    [changeInsectSelected, load]
  );

  const handleFeed = useCallback(async () => {
    unlockAudio();
    const result = await feedInsect();
    if (!result.success) {
      showMessage(result.message ?? "餵食失敗");
      return;
    }
    setAnimating("feed");
    const soundMs = await playSparkleSound();
    showMessage("餵食成功～");
    setTimeout(() => {
      setAnimating(null);
      load();
    }, Math.max(FEED_ANIMATION_MS, soundMs));
  }, [load]);

  const handleGrowthMedicine = useCallback(async () => {
    unlockAudio();
    const result = await useGrowthMedicine();
    if (!result.success) {
      showMessage(result.message ?? "使用失敗");
      return;
    }
    setAnimating("growth_medicine");
    const soundMs = await playSparkleSound();
    showMessage("使用高級成長藥，蟲蟲長大了一些～");
    setTimeout(() => {
      setAnimating(null);
      load();
    }, Math.max(GROWTH_MEDICINE_ANIMATION_MS, typeof soundMs === "number" ? soundMs : 0));
  }, [load]);

  const handleSpray = useCallback(async () => {
    unlockAudio();
    const result = await removeMites();
    if (!result.success) {
      showMessage(result.message ?? "除蟎失敗");
      return;
    }
    setAnimating("spray");
    const soundMs = await playSpraySound();
    showMessage("除蟎完成～");
    setTimeout(() => {
      setAnimating(null);
      load();
    }, Math.max(SPRAY_ANIMATION_MS, typeof soundMs === "number" ? soundMs : 0));
  }, [load]);

  const handleCleanShovel = useCallback(async () => {
    unlockAudio();
    const result = await cleanWithShovel();
    if (!result.success) {
      showMessage(result.message ?? "清潔失敗");
      return;
    }
    setAnimating("clean_shovel");
    const soundMs = await playSoilSound();
    showMessage("整理完成，蟲蟲更舒服～");
    setTimeout(() => {
      setAnimating(null);
      load();
    }, Math.max(CLEAN_ANIMATION_MS, typeof soundMs === "number" ? soundMs : 0));
  }, [load]);

  const handleCleanClips = useCallback(async () => {
    unlockAudio();
    const result = await cleanWithClips();
    if (!result.success) {
      showMessage(result.message ?? "清潔失敗");
      return;
    }
    setAnimating("clean_clips");
    const soundMs = await playSoilSound();
    showMessage("夾出糞便，清潔完成～");
    setTimeout(() => {
      setAnimating(null);
      load();
    }, Math.max(CLEAN_ANIMATION_MS, typeof soundMs === "number" ? soundMs : 0));
  }, [load]);

  const handleRelease = useCallback(async () => {
    unlockAudio();
    const result = await releaseInsect();
    if (!result.success) {
      showMessage(result.message ?? "放生失敗");
      return;
    }
    playCelebrationSound();
    setShowReleaseCelebration(true);
    showMessage(`放生成功！獲得 ${result.coinsAwarded ?? 0} 代幣`);
    setTimeout(() => {
      setShowReleaseCelebration(false);
      load();
    }, 1800);
  }, [load]);

  const hasHabitat = inventory?.hasInsectHabitat ?? false;
  const hasStagBeetleLarva = (inventory?.stagBeetleLarva ?? 0) > 0;
  const hasButterflyEgg = (inventory?.butterflyEgg ?? 0) > 0;
  const hasAnyLarva = hasStagBeetleLarva || hasButterflyEgg;
  const canStart = hasHabitat && hasAnyLarva && !insect;
  const feedCount = inventory?.insectFood ?? 0;
  const miteSprayCount = inventory?.miteSpray ?? 0;
  const growthMedicineCount = inventory?.advancedInsectGrowthMedicine ?? 0;
  const shovelCount = inventory?.tools?.insect_shovel ?? 0;
  const clipsCount = inventory?.tools?.insect_clips ?? 0;
  const isAdult = insect != null && insect.growthStage >= 5;
  const shovelRemainingMs =
    insect?.lastShovelUsedAt != null
      ? Math.max(0, insect.lastShovelUsedAt + SHOVEL_COOLDOWN_MS - now)
      : 0;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--primary)]/20 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
        <Link href="/" className="text-sm font-medium text-[var(--primary)] hover:underline">
          ← 回首頁
        </Link>
        <h1 className="text-lg font-bold text-[var(--foreground)] sm:text-xl">🪲 蟲屋</h1>
        <Link href="/shop" className="text-sm font-medium text-[var(--primary)] hover:underline">
          商店
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-6 sm:px-6 sm:py-8">
        {message && (
          <p
            className="mb-4 w-full max-w-md rounded-xl bg-green-100 px-4 py-2 text-center text-sm font-semibold text-green-800"
            role="status"
          >
            {message}
          </p>
        )}

        {showReleaseCelebration && (
          <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-amber-200/40">
            <div className="rounded-2xl bg-amber-100 px-8 py-6 text-center text-xl font-bold text-amber-900 shadow-lg">
              🎉 放生成功！獲得代幣
            </div>
          </div>
        )}

        {!hasHabitat && (
          <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-center">
            <Image src={HABITAT_EMPTY} alt="空飼養箱" width={200} height={160} className="rounded-lg object-contain" unoptimized />
            <p className="text-gray-700">還沒有飼養箱喔！請先到商店購買「鍬形蟲飼養箱」才能養蟲。</p>
            <Link
              href="/shop"
              className="min-h-[48px] rounded-xl bg-[var(--primary)] px-6 py-3 font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              前往商店
            </Link>
          </div>
        )}

        {hasHabitat && !insect && (
          <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-green-200 bg-green-50/80 p-6 text-center">
            <Image src={HABITAT_EMPTY} alt="空飼養箱" width={200} height={160} className="rounded-lg object-contain" unoptimized />
            {!hasAnyLarva ? (
              <>
                <p className="text-gray-700">飼養箱是空的～請到商店購買「鍬形蟲幼蟲」或「蝴蝶蟲卵」後再開始飼養。</p>
                <Link
                  href="/shop"
                  className="min-h-[48px] rounded-xl bg-[var(--primary)] px-6 py-3 font-semibold text-white hover:bg-[var(--primary-hover)]"
                >
                  前往商店
                </Link>
              </>
            ) : (
              <>
                <p className="text-gray-700">選擇要飼養的昆蟲：</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {hasStagBeetleLarva && (
                    <button
                      type="button"
                      onClick={() => handleStart("stag_beetle")}
                      className="flex flex-col items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50/80 px-6 py-4 font-semibold text-amber-900 hover:bg-amber-100 active:scale-[0.98]"
                    >
                      <Image src={`${STAG_BEETLE_BASE}/stag_beetle_1.png`} alt="" width={56} height={48} className="object-contain" unoptimized />
                      鍬形蟲（× {inventory?.stagBeetleLarva ?? 0}）
                    </button>
                  )}
                  {hasButterflyEgg && (
                    <button
                      type="button"
                      onClick={() => handleStart("butterfly")}
                      className="flex flex-col items-center gap-2 rounded-xl border-2 border-violet-300 bg-violet-50/80 px-6 py-4 font-semibold text-violet-900 hover:bg-violet-100 active:scale-[0.98]"
                    >
                      <Image src={`${BUTTERFLY_BASE}/butterfly_1.png`} alt="" width={56} height={48} className="object-contain" unoptimized />
                      蝴蝶（× {inventory?.butterflyEgg ?? 0}）
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {hasHabitat && insect && (
          <div className="relative w-full max-w-md">
            <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-amber-50/90 shadow-md">
              {/* 飼養箱 + 蟲 */}
              <div className="relative aspect-[4/3] min-h-[240px]">
                <Image
                  src={HABITAT_EMPTY}
                  alt="飼養箱"
                  fill
                  className="object-cover object-bottom"
                  unoptimized
                />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <Image
                    src={insect.insectId === "butterfly" ? `${BUTTERFLY_BASE}/butterfly_${insect.growthStage}.png` : `${STAG_BEETLE_BASE}/stag_beetle_${insect.growthStage}.png`}
                    alt={insect.insectId === "butterfly" ? `蝴蝶 階段 ${insect.growthStage}` : `鍬形蟲 階段 ${insect.growthStage}`}
                    width={140}
                    height={120}
                    className="insect-beetle-image insect-beetle-sway object-contain"
                    unoptimized
                  />
                </div>

                {/* 糞便（久未清潔時顯示） */}
                {insect.hasDirtyHabitat && !(animating === "clean_clips") && (
                  <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1" aria-hidden>
                    <Image src={INSECT_POOP_IMAGE} alt="" width={48} height={48} className="object-contain opacity-90" unoptimized />
                    <Image src={INSECT_POOP_IMAGE} alt="" width={40} height={40} className="object-contain opacity-85" unoptimized />
                  </div>
                )}

                {/* 蟎提示 */}
                {insect.hasMites && !(animating === "spray") && (
                  <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-amber-200/90 px-2 py-1 text-xs font-semibold text-amber-900">
                    <Image src={MITES_IMAGE} alt="" width={24} height={24} unoptimized />
                    有蟎
                  </div>
                )}
                {insect.hasMites && animating === "spray" && (
                  <div className="absolute right-2 top-2 z-[25] flex items-center gap-1 rounded-lg bg-amber-200/90 px-2 py-1 text-xs font-semibold text-amber-900">
                    <Image src={MITES_IMAGE} alt="" width={24} height={24} className="insect-mites-fade object-contain" style={{ animationDelay: "1.9s" }} unoptimized />
                    <span className="insect-mites-fade" style={{ animationDelay: "1.9s" }}>有蟎</span>
                  </div>
                )}

                {/* 餵食動畫 */}
                {animating === "feed" && (
                  <div
                    className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                    style={{ ["--feed-duration" as string]: `${FEED_ANIMATION_MS}ms` }}
                  >
                    <Image
                      src={INSECT_FOOD_IMAGE}
                      alt=""
                      width={64}
                      height={64}
                      className="insect-feed-drop object-contain"
                      unoptimized
                    />
                    <span className="insect-feed-sparkle absolute left-1/2 top-1/3 h-4 w-4 rounded-full bg-amber-300/80" aria-hidden />
                    <span className="insect-feed-sparkle absolute left-[45%] top-2/5 h-3 w-3 rounded-full bg-amber-200/80" style={{ animationDelay: "0.15s" }} aria-hidden />
                    <span className="insect-feed-sparkle absolute left-[55%] top-2/5 h-3 w-3 rounded-full bg-amber-200/80" style={{ animationDelay: "0.2s" }} aria-hidden />
                  </div>
                )}

                {/* 除蟎噴霧動畫（飼養箱中央顯示） */}
                {animating === "spray" && (
                  <div
                    className="garden-animate-spray pointer-events-none absolute inset-0 z-20 overflow-visible"
                    style={{ ["--spray-duration" as string]: `${SPRAY_ANIMATION_MS}ms` }}
                  >
                    <div className="garden-tool-spray-wrap insect-spray-center">
                      <Image src={MITE_SPRAY_IMAGE} alt="" width={56} height={56} className="garden-tool-spray-swing object-contain" unoptimized />
                    </div>
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <span
                        key={`spray-${i}`}
                        className="garden-spray-cloud absolute h-10 w-10 rounded-full bg-emerald-200/60"
                        style={{
                          top: `${32 + (i % 3) * 14}%`,
                          left: `${28 + (i % 2) * 22 + i * 2}%`,
                          animationDelay: `${0.08 + i * 0.1}s`,
                        }}
                      />
                    ))}
                    <span className="garden-spray-complete-flash" style={{ animationDelay: `${Math.round(SPRAY_ANIMATION_MS * 0.88)}ms` }} aria-hidden />
                  </div>
                )}

                {/* 清潔小鏟動畫 */}
                {animating === "clean_shovel" && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    <Image
                      src={INSECT_SHOVEL_IMAGE}
                      alt=""
                      width={80}
                      height={80}
                      className="insect-clean-shovel object-contain"
                      unoptimized
                    />
                  </div>
                )}

                {/* 清潔夾子動畫 */}
                {animating === "clean_clips" && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    <Image
                      src={INSECT_CLIPS_IMAGE}
                      alt=""
                      width={72}
                      height={72}
                      className="insect-clean-clips object-contain"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>

            {insect.hasMites && (
              <p className="mt-3 rounded-xl bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
                有蟎時成長變慢。除蟎需使用除蟎劑，請到商店購買。
              </p>
            )}

            {insect.hasDirtyHabitat && (
              <p className="mt-3 rounded-xl bg-rose-100 px-4 py-2 text-center text-sm font-semibold text-rose-900">
                蟲蟲生病了，生長變慢囉！快用夾子夾出糞便清潔～
                {clipsCount < 1 && " 請到商店購買昆蟲夾子。"}
              </p>
            )}

            {/* 生病預警：未生病但距上次清潔已久時提醒 */}
            {!insect.hasDirtyHabitat && (() => {
              const nowMs = Date.now();
              const lastCleanAt = insect.lastClipsUsedAt ?? insect.plantedAt;
              const msSinceClean = nowMs - lastCleanAt;
              const msUntilDirty = DIRTY_HABITAT_AFTER_MS - msSinceClean;
              const minutesUntilDirty = Math.ceil(msUntilDirty / (60 * 1000));
              const minutesSinceClean = Math.floor(msSinceClean / (60 * 1000));
              if (msUntilDirty > 0 && msUntilDirty <= DIRTY_WARNING_BEFORE_MS) {
                const timeLeftText = minutesUntilDirty < 60 ? `再 ${minutesUntilDirty} 分鐘` : `再 ${Math.ceil(minutesUntilDirty / 60)} 小時`;
                return (
                  <p className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-center text-sm font-medium text-amber-900">
                    {insect.lastClipsUsedAt != null
                      ? `距上次夾糞便已 ${minutesSinceClean} 分鐘，${timeLeftText}未清潔會生病喔～`
                      : `${timeLeftText}未清潔糞便會生病喔，記得用夾子清潔～`}
                  </p>
                );
              }
              if (insect.lastClipsUsedAt == null && msSinceClean >= 30 * 60 * 1000) {
                return (
                  <p className="mt-3 rounded-xl bg-amber-50/80 px-4 py-2 text-center text-sm text-amber-800">
                    記得定期用夾子清潔糞便，超過 1 小時未清潔會生病喔。
                  </p>
                );
              }
              return null;
            })()}

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {insect.hasMites && (
                <button
                  type="button"
                  onClick={handleSpray}
                  disabled={animating !== null || miteSprayCount < 1}
                  title={miteSprayCount < 1 ? "除蟎需使用除蟎劑，請到商店購買" : "使用 1 瓶除蟎劑除蟎"}
                  className="min-h-[48px] rounded-2xl bg-amber-100 px-6 font-bold text-amber-800 shadow-sm disabled:opacity-50 hover:bg-amber-200 active:scale-[0.98] disabled:cursor-not-allowed"
                >
                  🧴 除蟎（除蟎劑 × {miteSprayCount}）
                </button>
              )}
              {!isAdult && (
                <>
                  <button
                    type="button"
                    onClick={handleFeed}
                    disabled={animating !== null || feedCount < 1}
                    title={feedCount < 1 ? "請到商店購買昆蟲飼料" : undefined}
                    className="min-h-[48px] rounded-2xl bg-green-600 px-6 font-bold text-white shadow-sm disabled:opacity-50 hover:bg-green-700 active:scale-[0.98] disabled:cursor-not-allowed"
                  >
                    🍎 餵食（× {feedCount}）
                  </button>
                  {growthMedicineCount > 0 && (
                    <button
                      type="button"
                      onClick={handleGrowthMedicine}
                      disabled={animating !== null}
                      title="使用高級昆蟲成長藥，增加較多成長值"
                      className="min-h-[48px] rounded-2xl bg-emerald-700 px-6 font-bold text-emerald-100 shadow-sm disabled:opacity-50 hover:bg-emerald-800 active:scale-[0.98] disabled:cursor-not-allowed"
                    >
                      💊 成長藥（× {growthMedicineCount}）
                    </button>
                  )}
                </>
              )}
              {shovelCount > 0 && (
                <button
                  type="button"
                  onClick={handleCleanShovel}
                  disabled={animating !== null || shovelRemainingMs > 0}
                  title="幫忙整理昆蟲的家，可以幫助昆蟲生長"
                  className="min-h-[48px] rounded-2xl bg-amber-700 px-6 font-bold text-amber-100 shadow-sm disabled:opacity-50 hover:bg-amber-800 active:scale-[0.98] disabled:cursor-not-allowed"
                >
                  🧹 整理蟲的家（小鏟 × {shovelCount}）
                  {shovelRemainingMs > 0 && ` · 冷卻 ${formatCooldown(shovelRemainingMs)}`}
                </button>
              )}
              {clipsCount > 0 && (
                <button
                  type="button"
                  onClick={handleCleanClips}
                  disabled={animating !== null}
                  title="蟲會不定時大便，用夾子夾出糞便清潔飼養箱"
                  className="min-h-[48px] rounded-2xl bg-stone-600 px-6 font-bold text-stone-100 shadow-sm disabled:opacity-50 hover:bg-stone-700 active:scale-[0.98] disabled:cursor-not-allowed"
                >
                  📎 夾出糞便（夾子 × {clipsCount}）
                </button>
              )}
              {isAdult && (
                <button
                  type="button"
                  onClick={handleRelease}
                  disabled={animating !== null}
                  className="min-h-[48px] rounded-2xl bg-emerald-600 px-6 font-bold text-white shadow-sm disabled:opacity-50 hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed"
                >
                  🦋 放生（獲得代幣）
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowChangeInsectModal(true)}
                disabled={animating !== null}
                className="min-h-[48px] rounded-2xl border-2 border-amber-300 bg-amber-50 px-6 font-bold text-amber-800 shadow-sm disabled:opacity-50 hover:bg-amber-100 active:scale-[0.98] disabled:cursor-not-allowed"
              >
                🔄 變更昆蟲
              </button>
            </div>

            <p className="mt-3 text-center text-sm text-gray-600">
              成長階段：{STAGE_NAMES[insect.growthStage] ?? "?"}（{insect.growthStage}/5）
              {insect.feedCount != null && insect.feedCount > 0 && ` · 餵食 ${insect.feedCount} 次`}
            </p>
          </div>
        )}

        {/* 變更昆蟲：選單 + 確認 */}
        {showChangeInsectModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-insect-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowChangeInsectModal(false);
                setChangeInsectSelected(null);
              }
            }}
          >
            <div className="w-full max-w-sm rounded-3xl border-2 border-amber-200 bg-white p-6 shadow-xl">
              <h2 id="change-insect-title" className="mb-4 text-center text-lg font-bold text-[var(--foreground)]">
                🔄 變更昆蟲
              </h2>
              {!changeInsectSelected ? (
                <>
                  <p className="mb-3 text-center text-sm text-gray-600">選擇要改養的昆蟲（目前昆蟲將消失，無法復原）</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {hasStagBeetleLarva && (
                      <button
                        type="button"
                        onClick={() => setChangeInsectSelected("stag_beetle")}
                        className="flex flex-col items-center gap-2 rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-4 transition hover:border-amber-400 hover:bg-amber-100"
                      >
                        <Image src={`${STAG_BEETLE_BASE}/stag_beetle_1.png`} alt="" width={64} height={56} className="object-contain" unoptimized />
                        <span className="font-semibold text-amber-900">鍬形蟲</span>
                        <span className="text-xs text-amber-700">× {inventory?.stagBeetleLarva ?? 0}</span>
                      </button>
                    )}
                    {hasButterflyEgg && (
                      <button
                        type="button"
                        onClick={() => setChangeInsectSelected("butterfly")}
                        className="flex flex-col items-center gap-2 rounded-2xl border-2 border-violet-300 bg-violet-50/80 p-4 transition hover:border-violet-400 hover:bg-violet-100"
                      >
                        <Image src={`${BUTTERFLY_BASE}/butterfly_1.png`} alt="" width={64} height={56} className="object-contain" unoptimized />
                        <span className="font-semibold text-violet-900">蝴蝶</span>
                        <span className="text-xs text-violet-700">× {inventory?.butterflyEgg ?? 0}</span>
                      </button>
                    )}
                  </div>
                  {!hasStagBeetleLarva && !hasButterflyEgg && (
                    <p className="mt-3 text-center text-sm text-amber-700">沒有可換養的昆蟲，請到商店購買鍬形蟲幼蟲或蝴蝶蟲卵。</p>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-sm text-gray-600">
                    確定要改養{changeInsectSelected === "butterfly" ? "蝴蝶" : "鍬形蟲"}嗎？目前的蟲蟲將會消失喔。
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setChangeInsectSelected(null)}
                      className="flex-1 rounded-xl border-2 border-gray-300 bg-gray-100 py-2 font-semibold text-gray-700 hover:bg-gray-200"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleChangeInsectConfirm}
                      className="flex-1 rounded-xl bg-amber-600 py-2 font-semibold text-white hover:bg-amber-700"
                    >
                      確定
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
