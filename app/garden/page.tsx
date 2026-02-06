"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getGarden,
  plantSeed,
  water,
  fertilize,
  harvest,
  trimWeeds,
  loosenSoil,
  mistPlant,
  repotPlant,
  applyPottingSoil,
} from "@/src/persistence/garden";
import { getInventoryState } from "@/src/persistence/inventory";
import { getHasWeeds, setLastGardenVisit } from "@/src/persistence/gardenVisit";
import { getSeedGrowthImagePath, SEED_NAMES } from "@/src/garden/assets";
import { SHOP_CATALOG } from "@/src/shop/catalog";
import { playWaterSound, playSpraySound, playSoilSound, playSparkleSound, playScissorSound } from "@/src/lib/sound";

type GardenAnimating = "water" | "fertilize" | "weed" | "fork" | "mist" | "soil" | null;

const ANIMATION_DURATION_MS = 1200;
/** 澆水動畫較長：水壺傾倒 + 水流，總時長 */
const WATER_ANIMATION_DURATION_MS = 2800;
/** 肥料動畫：依購買的消耗品圖示呈現，每次至少 3 秒 */
const FERTILIZE_ANIMATION_DURATION_MS = 3200;
/** 鬆土動畫：短時間震動 + 土粒 */
const FORK_ANIMATION_DURATION_MS = 1200;
/** 噴霧動畫：霧氣飄散 */
const MIST_ANIMATION_DURATION_MS = 1400;
const SOIL_ANIMATION_DURATION_MS = 1400;
const FORK_COOLDOWN_MS = 0;
const MIST_COOLDOWN_MS = 0;
/** 商店消耗品圖示（與商店顯示一致） */
const FERTILIZER_BASIC_IMAGE = "/garden-assets/gargen_tools/normal fertilizer.png";
const FERTILIZER_PREMIUM_IMAGE = "/garden-assets/gargen_tools/Advanced_fertilizer.png";
const FERTILIZER_BOTTLE_IMAGE = "/garden-assets/gargen_tools/Fertilizer Bottle.png";
const WATER_IMAGE = "/garden-assets/gargen_tools/water.png";
const GARDEN_FORK_IMAGE = "/garden-assets/gargen_tools/Garden Fork.png";
const PLANT_MISTER_IMAGE = "/garden-assets/gargen_tools/Plant Mister.png";
const GARDEN_SCISSORS_IMAGE = "/garden-assets/gargen_tools/Garden Scissors.png";
const GARDEN_TROWEL_IMAGE = "/garden-assets/gargen_tools/Garden Trowel.png";
const POTTING_SOIL_IMAGE = "/garden-assets/gargen_tools/Potting Soil.png";

const GRASS_BASE = "/garden-assets/grass";
const GRASS_IMAGES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${GRASS_BASE}/grass_${n}.png`);
/** 野草疊層：集中在盆土區域 */
const WEED_POSITIONS: { top?: string; bottom?: string; left?: string; right?: string; size: number }[] = [
  { bottom: "12%", left: "8%", size: 26 },
  { bottom: "10%", right: "8%", size: 28 },
  { bottom: "22%", left: "20%", size: 22 },
  { bottom: "24%", right: "18%", size: 24 },
  { bottom: "30%", left: "40%", size: 22 },
  { bottom: "28%", right: "42%", size: 22 },
];

/** 從庫存取得第一個擁有的水壺圖片路徑（用於澆水動畫）；若無則用目錄中第一個水壺 */
function getWateringCanImagePath(wateringCans: Record<string, number> | undefined): string {
  const WATERING_CAN_BASE = "/garden-assets/watering_can";
  const defaultPath = `${WATERING_CAN_BASE}/watering-can_blue.png`;
  if (!wateringCans || Object.keys(wateringCans).length === 0) return defaultPath;
  const firstOwnedId = Object.entries(wateringCans).find(([, n]) => n > 0)?.[0];
  if (!firstOwnedId) return defaultPath;
  const item = SHOP_CATALOG.find(
    (x) => x.type === "watering_can" && x.wateringCanId === firstOwnedId
  );
  return item?.wateringCanImagePath ?? defaultPath;
}

export default function GardenPage() {
  const [garden, setGarden] = useState<Awaited<ReturnType<typeof getGarden>>>(null);
  const [inventory, setInventory] = useState<Awaited<ReturnType<typeof getInventoryState>> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [plantingSeedId, setPlantingSeedId] = useState<string | null>(null);
  const [hasWeeds, setHasWeeds] = useState(false);
  const [animating, setAnimating] = useState<GardenAnimating>(null);
  /** 施肥動畫時區分一般／高級，用於粒子顏色與樣式 */
  const [fertilizeType, setFertilizeType] = useState<"basic" | "premium" | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const wateringCanImagePath = useMemo(
    () => getWateringCanImagePath(inventory?.wateringCans),
    [inventory?.wateringCans]
  );

  const load = useCallback(async () => {
    try {
      const [g, inv] = await Promise.all([getGarden(), getInventoryState()]);
      setGarden(g);
      setInventory(inv);
      setHasWeeds(getHasWeeds());
    } catch {
      setGarden(null);
      setInventory(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!garden) return;
    const t = setInterval(() => {
      const current = Date.now();
      const hasForkCooldown = garden.lastForkedAt != null && current - garden.lastForkedAt < FORK_COOLDOWN_MS;
      const hasMistCooldown = garden.lastMistedAt != null && current - garden.lastMistedAt < MIST_COOLDOWN_MS;
      setNow(current);
      if (!hasForkCooldown && !hasMistCooldown) {
        clearInterval(t);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [garden]);

  useEffect(() => {
    return () => {
      setLastGardenVisit();
    };
  }, []);

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

  const handlePlant = useCallback(
    async (seedId: string) => {
      const result = await plantSeed(seedId);
      if (result.success) {
        showMessage("種植成功！");
        load();
        setPlantingSeedId(null);
      } else {
        showMessage(result.message ?? "種植失敗");
      }
    },
    [load]
  );

  const handleWater = useCallback(async () => {
    const result = await water();
    if (result.success) {
      setAnimating("water");
      const soundMs = await playWaterSound();
      showMessage("澆水成功～");
      setTimeout(() => {
        setAnimating(null);
        load();
      }, Math.max(WATER_ANIMATION_DURATION_MS, soundMs));
    } else {
      showMessage(result.message ?? "澆水失敗");
    }
  }, [load]);

  const handleFertilize = useCallback(
    async (type: "basic" | "premium") => {
      const result = await fertilize(type);
      if (result.success) {
        setFertilizeType(type);
        setAnimating("fertilize");
        const soundMs =
          type === "premium" ? await playSparkleSound() : await playSoilSound();
        showMessage(type === "basic" ? "施用一般肥料成功～" : "施用高級肥料成功～");
        setTimeout(() => {
          setAnimating(null);
          setFertilizeType(null);
          load();
        }, Math.max(FERTILIZE_ANIMATION_DURATION_MS, soundMs));
      } else {
        showMessage(result.message ?? "施肥失敗");
      }
    },
    [load]
  );

  const handleWeed = useCallback(async () => {
    const result = await trimWeeds();
    if (result.success) {
      setHasWeeds(false);
      setAnimating("weed");
      await playScissorSound();
      showMessage("雜草修剪完成～ 成長 +0.1");
      setTimeout(() => setAnimating(null), 700);
    } else {
      showMessage(result.message ?? "除草失敗");
    }
  }, []);

  const handleFork = useCallback(async () => {
    const result = await loosenSoil();
    if (result.success) {
      setAnimating("fork");
      const soundMs = await playSoilSound();
      showMessage("鬆土完成，成長 +0.12");
      setTimeout(() => {
        setAnimating(null);
        load();
      }, Math.max(FORK_ANIMATION_DURATION_MS, soundMs));
    } else {
      showMessage(result.message ?? "鬆土失敗");
    }
  }, [load]);

  const handleMister = useCallback(async () => {
    const result = await mistPlant();
    if (result.success) {
      setAnimating("mist");
      const soundMs = await playSpraySound();
      showMessage("噴霧保濕完成～ 成長 +0.05");
      setTimeout(() => {
        setAnimating(null);
        load();
      }, Math.max(MIST_ANIMATION_DURATION_MS, soundMs));
    } else {
      showMessage(result.message ?? "噴霧失敗");
    }
  }, [load]);

  const handleTrowel = useCallback(async () => {
    const result = await repotPlant();
    if (result.success) {
      playSoilSound();
      showMessage("換盆整理完成，成長 +0.5");
      load();
    } else {
      showMessage(result.message ?? "換盆失敗");
    }
  }, [load]);

  const handleSoil = useCallback(async () => {
    const result = await applyPottingSoil();
    if (result.success) {
      setAnimating("soil");
      const soundMs = await playSoilSound();
      showMessage("營養土已添加，成長加速 +10%");
      setTimeout(() => {
        setAnimating(null);
        load();
      }, Math.max(SOIL_ANIMATION_DURATION_MS, soundMs));
    } else {
      showMessage(result.message ?? "添加失敗");
    }
  }, [load]);

  const forkRemainingMs = garden?.lastForkedAt
    ? Math.max(0, FORK_COOLDOWN_MS - (now - garden.lastForkedAt))
    : 0;
  const mistRemainingMs = garden?.lastMistedAt
    ? Math.max(0, MIST_COOLDOWN_MS - (now - garden.lastMistedAt))
    : 0;

  const handleHarvest = useCallback(async () => {
    const result = await harvest();
    if (result.success) {
      showMessage("收成完成，可以再種新種子～");
      load();
    }
  }, [load]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <Link href="/" className="font-semibold text-[var(--primary)] hover:underline">
          ← 返回首頁
        </Link>
        <h1 className="text-center text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
          🌱 我的花園
        </h1>
        {message && (
          <p className="rounded-xl bg-amber-100 px-4 py-2 text-center font-semibold text-amber-900 shadow-sm" role="status">
            {message}
          </p>
        )}
        {!garden && (
          <div className="flex flex-col items-center gap-5 rounded-3xl border-2 border-green-200 bg-white/90 p-6 shadow-lg">
            <p className="text-center text-gray-600">還沒有植物，選一顆種子種下吧！</p>
            {plantingSeedId ? (
              <div className="flex flex-wrap justify-center gap-3">
                {(inventory?.seeds ?? {})[plantingSeedId] != null && (inventory?.seeds ?? {})[plantingSeedId] > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePlant(plantingSeedId)}
                      className="min-h-[48px] rounded-2xl bg-[var(--primary)] px-6 font-bold text-white shadow-md hover:bg-[var(--primary-hover)] active:scale-[0.98]"
                    >
                      確認種植 {SEED_NAMES[plantingSeedId] ?? plantingSeedId}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlantingSeedId(null)}
                      className="min-h-[48px] rounded-2xl border-2 border-gray-300 px-6 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">沒有此種子，請到商店購買</p>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-4">
                {["pink_flower", "sun_flower"].map((seedId) => (
                  <button
                    key={seedId}
                    type="button"
                    onClick={() => setPlantingSeedId(seedId)}
                    disabled={((inventory?.seeds ?? {})[seedId] ?? 0) < 1}
                    className="flex flex-col items-center gap-2 rounded-2xl border-2 border-green-200 bg-green-50/80 p-4 transition hover:border-green-400 hover:bg-green-100 disabled:opacity-50"
                  >
                    <div className="relative h-16 w-16">
                      <Image
                        src={getSeedGrowthImagePath(seedId, 0)}
                        alt=""
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <span className="font-bold text-[var(--foreground)]">{SEED_NAMES[seedId] ?? seedId}</span>
                    <span className="text-sm text-gray-500">× {(inventory?.seeds ?? {})[seedId] ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {garden && (
          <div className="flex flex-col items-center gap-6 rounded-3xl border-2 border-green-200 bg-white/90 p-6 shadow-lg">
            <p className="text-center text-lg font-bold text-[var(--foreground)]">
              {SEED_NAMES[garden.seedId] ?? garden.seedId}
              {garden.isBloom && " 🌸 已開花"}
            </p>
            <div className="relative h-48 w-48 sm:h-56 sm:w-56">
              <Image
                src={getSeedGrowthImagePath(garden.seedId, garden.growthStage)}
                alt=""
                fill
                className="garden-plant-sway object-contain"
                unoptimized
              />
              {hasWeeds && (
                <div
                  className={`pointer-events-none absolute bottom-0 left-0 right-0 h-[45%] overflow-hidden ${animating === "weed" ? "garden-animate-weed garden-weed-layer" : ""}`}
                  aria-hidden
                >
                  {WEED_POSITIONS.map((pos, i) => (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        top: pos.top,
                        bottom: pos.bottom,
                        left: pos.left,
                        right: pos.right,
                        width: pos.size,
                        height: pos.size,
                      }}
                    >
                      <Image
                        src={GRASS_IMAGES[i % GRASS_IMAGES.length]}
                        alt=""
                        fill
                        className="object-contain drop-shadow-md"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}
              {animating === "water" && (
                <div className="garden-animate-water pointer-events-none absolute inset-0 z-10 overflow-visible">
                  <div className="garden-watering-can-wrap">
                    <Image
                      src={wateringCanImagePath}
                      alt=""
                      width={80}
                      height={80}
                      className="garden-watering-can-pour object-contain"
                      unoptimized
                    />
                  </div>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <span
                      key={i}
                      className="garden-water-dot absolute top-0 h-2 w-2 rounded-full bg-blue-400/90"
                      style={{
                        left: `${15 + (i % 4) * 22}%`,
                        animationDelay: `${0.6 + i * 0.15}s`,
                      }}
                    />
                  ))}
                  {[0, 1, 2].map((i) => (
                    <span
                      key={`splash-${i}`}
                      className="garden-water-splash-ring absolute bottom-[18%] left-1/2 h-10 w-10 -translate-x-1/2 rounded-full border-2 border-blue-300/70"
                      style={{
                        animationDelay: `${1.2 + i * 0.35}s`,
                      }}
                    />
                  ))}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={`spark-${i}`}
                      className="garden-water-sparkle absolute h-2 w-2 rounded-sm bg-sky-200"
                      style={{
                        top: `${36 + (i % 3) * 14}%`,
                        left: `${26 + (i % 2) * 22 + i * 3}%`,
                        animationDelay: `${0.9 + i * 0.18}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              {animating === "fork" && (
                <div className="garden-animate-fork pointer-events-none absolute inset-0 z-10 overflow-visible">
                  <div className="garden-tool-fork-wrap">
                    <Image
                      src={GARDEN_FORK_IMAGE}
                      alt=""
                      width={86}
                      height={86}
                      className="garden-tool-fork-swing object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="garden-fork-shake-layer absolute inset-0 rounded-full" />
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <span
                      key={`dirt-${i}`}
                      className="garden-fork-dirt absolute h-2 w-2 rounded-full bg-amber-600/80"
                      style={{
                        top: `${40 + (i % 3) * 12}%`,
                        left: `${30 + (i % 4) * 14}%`,
                        animationDelay: `${0.1 + i * 0.08}s`,
                      }}
                    />
                  ))}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={`fork-spark-${i}`}
                      className="garden-fork-sparkle absolute h-3 w-3 rounded-sm bg-amber-100"
                      style={{
                        top: `${32 + (i % 3) * 16}%`,
                        left: `${28 + (i % 2) * 22 + i * 3}%`,
                        animationDelay: `${0.2 + i * 0.12}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              {animating === "mist" && (
                <div className="garden-animate-mist pointer-events-none absolute inset-0 z-10 overflow-visible">
                  <div className="garden-tool-mist-wrap">
                    <Image
                      src={PLANT_MISTER_IMAGE}
                      alt=""
                      width={86}
                      height={86}
                      className="garden-tool-mist-swing object-contain"
                      unoptimized
                    />
                  </div>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={`mist-${i}`}
                      className="garden-mist-cloud absolute h-10 w-10 rounded-full bg-sky-200/70"
                      style={{
                        top: `${30 + (i % 3) * 14}%`,
                        left: `${25 + (i % 2) * 20 + i * 4}%`,
                        animationDelay: `${0.05 + i * 0.12}s`,
                      }}
                    />
                  ))}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={`mist-spark-${i}`}
                      className="garden-mist-sparkle absolute h-2 w-2 rounded-sm bg-sky-100"
                      style={{
                        top: `${38 + (i % 3) * 12}%`,
                        left: `${32 + (i % 2) * 18 + i * 3}%`,
                        animationDelay: `${0.2 + i * 0.15}s`,
                      }}
                    />
                  ))}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={`mist-drop-${i}`}
                      className="garden-mist-drop absolute h-2 w-2 rounded-full bg-sky-300"
                      style={{
                        top: `${40 + (i % 3) * 12}%`,
                        left: `${24 + (i % 4) * 14}%`,
                        animationDelay: `${0.3 + i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              {animating === "soil" && (
                <div className="garden-animate-soil pointer-events-none absolute inset-0 z-10 overflow-visible">
                  <div className="garden-soil-bag-wrap">
                    <Image
                      src={POTTING_SOIL_IMAGE}
                      alt=""
                      width={86}
                      height={86}
                      className="garden-soil-bag-pour object-contain"
                      unoptimized
                    />
                  </div>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <span
                      key={`soil-${i}`}
                      className="garden-soil-particle absolute h-2.5 w-2.5 rounded-full bg-amber-700/80"
                      style={{
                        top: `${34 + (i % 4) * 14}%`,
                        left: `${26 + (i % 4) * 14}%`,
                        animationDelay: `${0.2 + i * 0.1}s`,
                      }}
                    />
                  ))}
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={`soil-spark-${i}`}
                      className="garden-soil-sparkle absolute h-3 w-3 rounded-sm bg-amber-100"
                      style={{
                        top: `${30 + (i % 2) * 18}%`,
                        left: `${38 + i * 10}%`,
                        animationDelay: `${0.35 + i * 0.12}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              {animating === "fertilize" && (
                <div
                  className={`pointer-events-none absolute inset-0 z-10 overflow-visible ${fertilizeType === "premium" ? "garden-animate-fertilize-premium" : "garden-animate-fertilize-basic"}`}
                >
                  <div className="garden-fertilize-product-wrap">
                    <Image
                      src={fertilizeType === "premium" ? FERTILIZER_PREMIUM_IMAGE : FERTILIZER_BASIC_IMAGE}
                      alt=""
                      width={80}
                      height={80}
                      className="garden-fertilize-product-pour object-contain"
                      unoptimized
                    />
                  </div>
                  {/* 一般肥料：琥珀色粒子（袋裝撒落感） */}
                  {fertilizeType === "basic" &&
                    [0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <span
                        key={`p-${i}`}
                        className="garden-fertilize-particle absolute h-3 w-3 rounded-full bg-amber-300"
                        style={{
                          top: `${28 + (i % 4) * 18}%`,
                          left: `${18 + Math.floor(i / 4) * 28}%`,
                          animationDelay: `${0.5 + i * 0.12}s`,
                        }}
                      />
                    ))}
                  {/* 高級肥料：紫色光點 + 光環，效果更華麗 */}
                  {fertilizeType === "premium" && (
                    <>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                        <span
                          key={`premium-${i}`}
                          className="garden-fertilize-particle-premium absolute h-2.5 w-2.5 rounded-full bg-purple-400"
                          style={{
                            top: `${22 + (i % 4) * 18}%`,
                            left: `${12 + Math.floor(i / 4) * 28}%`,
                            animationDelay: `${0.3 + i * 0.14}s`,
                          }}
                        />
                      ))}
                      <div className="garden-fertilize-premium-glow" aria-hidden />
                    </>
                  )}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={`fert-spark-${i}`}
                      className="garden-fertilize-sparkle absolute h-3 w-3 rounded-sm bg-yellow-100"
                      style={{
                        top: `${26 + (i % 3) * 18}%`,
                        left: `${30 + (i % 2) * 18 + i * 4}%`,
                        animationDelay: `${0.6 + i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              {animating === "weed" && (
                <div className="garden-animate-weed pointer-events-none absolute inset-0 z-10 overflow-visible">
                  <div className="garden-weed-scissors-wrap">
                    <Image
                      src={GARDEN_SCISSORS_IMAGE}
                      alt=""
                      width={86}
                      height={86}
                      className="garden-weed-scissors-snap object-contain"
                      unoptimized
                    />
                  </div>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={`snip-${i}`}
                      className="garden-weed-snip absolute h-8 w-8 rounded-full border-2 border-green-200/70"
                      style={{
                        top: `${28 + i * 16}%`,
                        left: `${40 + (i % 2) * 12}%`,
                        animationDelay: `${0.1 + i * 0.12}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            {!garden.isBloom && (
              <div className="flex flex-wrap justify-center gap-3">
                {hasWeeds && (
                  <button
                    type="button"
                    onClick={handleWeed}
                    disabled={animating !== null || (inventory?.tools?.garden_scissors ?? 0) < 1}
                    className="min-h-[48px] rounded-2xl bg-green-600 px-6 font-bold text-white shadow-md disabled:opacity-50 hover:bg-green-700 active:scale-[0.98]"
                  >
                    ✂️ 修剪雜草
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleWater}
                  disabled={(inventory?.water ?? 0) < 1 || animating !== null}
                  className="min-h-[48px] rounded-2xl bg-blue-100 px-6 font-bold text-blue-800 shadow-sm disabled:opacity-50 hover:bg-blue-200 active:scale-[0.98]"
                >
                  <span className="garden-action-icon">💧</span> 澆水（水 × {inventory?.water ?? 0}）
                </button>
                <button
                  type="button"
                  onClick={() => handleFertilize("basic")}
                  disabled={(inventory?.fertilizerBasic ?? 0) < 1 || animating !== null}
                  className="min-h-[48px] rounded-2xl bg-amber-100 px-6 font-bold text-amber-800 shadow-sm disabled:opacity-50 hover:bg-amber-200 active:scale-[0.98]"
                >
                  <span className="garden-action-icon">🌿</span> 一般肥料（× {inventory?.fertilizerBasic ?? 0}）
                </button>
                <button
                  type="button"
                  onClick={() => handleFertilize("premium")}
                  disabled={(inventory?.fertilizerPremium ?? 0) < 1 || animating !== null}
                  className="min-h-[48px] rounded-2xl bg-purple-100 px-6 font-bold text-purple-800 shadow-sm disabled:opacity-50 hover:bg-purple-200 active:scale-[0.98]"
                >
                  <span className="garden-action-icon">✨</span> 高級肥料（× {inventory?.fertilizerPremium ?? 0}）
                </button>
                {((inventory?.tools?.garden_fork ?? 0) > 0 ||
                  (inventory?.tools?.plant_mister ?? 0) > 0 ||
                  (inventory?.tools?.garden_trowel ?? 0) > 0 ||
                  (inventory?.tools?.potting_soil ?? 0) > 0) && (
                  <div className="flex w-full flex-wrap justify-center gap-3">
                    {(inventory?.tools?.garden_fork ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={handleFork}
                        disabled={animating !== null || forkRemainingMs > 0}
                        className="min-h-[48px] rounded-2xl bg-emerald-100 px-4 font-bold text-emerald-800 shadow-sm disabled:opacity-50 hover:bg-emerald-200 active:scale-[0.98]"
                      >
                        <span className="garden-action-icon">🪴</span> 鬆土（園藝叉）
                        {forkRemainingMs > 0 && ` · 冷卻 ${formatCooldown(forkRemainingMs)}`}
                      </button>
                    )}
                    {(inventory?.tools?.plant_mister ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={handleMister}
                        disabled={animating !== null || mistRemainingMs > 0}
                        className="min-h-[48px] rounded-2xl bg-sky-100 px-4 font-bold text-sky-800 shadow-sm disabled:opacity-50 hover:bg-sky-200 active:scale-[0.98]"
                      >
                        <span className="garden-action-icon">💧</span> 噴霧保濕
                        {mistRemainingMs > 0 && ` · 冷卻 ${formatCooldown(mistRemainingMs)}`}
                      </button>
                    )}
                    {(inventory?.tools?.garden_trowel ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={handleTrowel}
                        disabled={animating !== null}
                        className="min-h-[48px] rounded-2xl bg-orange-100 px-4 font-bold text-orange-800 shadow-sm disabled:opacity-50 hover:bg-orange-200 active:scale-[0.98]"
                      >
                        <span className="garden-action-icon">🧤</span> 換盆整理（園藝鏟）
                      </button>
                    )}
                    {(inventory?.tools?.potting_soil ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={handleSoil}
                        disabled={animating !== null}
                        className="min-h-[48px] rounded-2xl bg-amber-100 px-4 font-bold text-amber-800 shadow-sm disabled:opacity-50 hover:bg-amber-200 active:scale-[0.98]"
                      >
                        <span className="garden-action-icon">🌱</span> 添加營養土
                      </button>
                    )}
                  </div>
                )}
                {(inventory?.tools?.fertilizer_bottle ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 shadow-sm">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">✓</span>
                    肥料瓶加成啟用
                  </span>
                )}
              </div>
            )}
            {garden.isBloom && (
              <button
                type="button"
                onClick={handleHarvest}
                className="min-h-[48px] rounded-2xl bg-[var(--primary)] px-6 font-bold text-white shadow-md hover:bg-[var(--primary-hover)] active:scale-[0.98]"
              >
                🌸 收成（可再種新種子）
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
