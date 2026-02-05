"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getGarden, plantSeed, water, fertilize, harvest } from "@/src/persistence/garden";
import { getInventoryState } from "@/src/persistence/inventory";
import { getHasWeeds, setLastGardenVisit } from "@/src/persistence/gardenVisit";
import { getSeedGrowthImagePath, SEED_NAMES } from "@/src/garden/assets";
import { SHOP_CATALOG } from "@/src/shop/catalog";

type GardenAnimating = "water" | "fertilize" | "weed" | null;

const ANIMATION_DURATION_MS = 1200;
/** 澆水動畫較長：水壺傾倒 + 水流，總時長 */
const WATER_ANIMATION_DURATION_MS = 2800;
/** 肥料動畫：依購買的消耗品圖示呈現，每次至少 3 秒 */
const FERTILIZE_ANIMATION_DURATION_MS = 3200;
/** 商店消耗品圖示（與商店顯示一致） */
const FERTILIZER_BASIC_IMAGE = "/garden-assets/gargen_tools/normal fertilizer.png";
const FERTILIZER_PREMIUM_IMAGE = "/garden-assets/gargen_tools/Advanced_fertilizer.png";

const GRASS_BASE = "/garden-assets/grass";
const GRASS_IMAGES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${GRASS_BASE}/grass_${n}.png`);
/** 野草疊層：每株野草的位置與使用的圖片索引 */
const WEED_POSITIONS: { top?: string; bottom?: string; left?: string; right?: string; size: number }[] = [
  { top: "2%", left: "8%", size: 28 },
  { top: "5%", right: "5%", size: 32 },
  { bottom: "18%", left: "5%", size: 26 },
  { bottom: "22%", right: "10%", size: 30 },
  { top: "35%", left: "0%", size: 24 },
  { top: "40%", right: "2%", size: 28 },
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
    return () => {
      setLastGardenVisit();
    };
  }, []);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2500);
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
      showMessage("澆水成功～");
      setTimeout(() => {
        setAnimating(null);
        load();
      }, WATER_ANIMATION_DURATION_MS);
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
        showMessage(type === "basic" ? "施用一般肥料成功～" : "施用高級肥料成功～");
        setTimeout(() => {
          setAnimating(null);
          setFertilizeType(null);
          load();
        }, FERTILIZE_ANIMATION_DURATION_MS);
      } else {
        showMessage(result.message ?? "施肥失敗");
      }
    },
    [load]
  );

  const handleWeed = useCallback(() => {
    setLastGardenVisit();
    setHasWeeds(false);
    setAnimating("weed");
    showMessage("雜草除好了～");
    setTimeout(() => setAnimating(null), 700);
  }, []);

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
                className="object-contain"
                unoptimized
              />
              {hasWeeds && (
                <div
                  className={`pointer-events-none absolute inset-0 overflow-hidden rounded-full bg-green-900/20 ${animating === "weed" ? "garden-animate-weed garden-weed-layer" : ""}`}
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
                </div>
              )}
            </div>
            {!garden.isBloom && (
              <div className="flex flex-wrap justify-center gap-3">
                {hasWeeds && (
                  <button
                    type="button"
                    onClick={handleWeed}
                    className="min-h-[48px] rounded-2xl bg-green-600 px-6 font-bold text-white shadow-md hover:bg-green-700 active:scale-[0.98]"
                  >
                    🌿 除草
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleWater}
                  disabled={(inventory?.water ?? 0) < 1 || animating !== null}
                  className="min-h-[48px] rounded-2xl bg-blue-100 px-6 font-bold text-blue-800 shadow-sm disabled:opacity-50 hover:bg-blue-200 active:scale-[0.98]"
                >
                  💧 澆水（水 × {inventory?.water ?? 0}）
                </button>
                <button
                  type="button"
                  onClick={() => handleFertilize("basic")}
                  disabled={(inventory?.fertilizerBasic ?? 0) < 1 || animating !== null}
                  className="min-h-[48px] rounded-2xl bg-amber-100 px-6 font-bold text-amber-800 shadow-sm disabled:opacity-50 hover:bg-amber-200 active:scale-[0.98]"
                >
                  🌿 一般肥料（× {inventory?.fertilizerBasic ?? 0}）
                </button>
                <button
                  type="button"
                  onClick={() => handleFertilize("premium")}
                  disabled={(inventory?.fertilizerPremium ?? 0) < 1 || animating !== null}
                  className="min-h-[48px] rounded-2xl bg-purple-100 px-6 font-bold text-purple-800 shadow-sm disabled:opacity-50 hover:bg-purple-200 active:scale-[0.98]"
                >
                  ✨ 高級肥料（× {inventory?.fertilizerPremium ?? 0}）
                </button>
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
