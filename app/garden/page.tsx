"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { getGarden, plantSeed, water, fertilize, harvest } from "@/src/persistence/garden";
import { getInventoryState } from "@/src/persistence/inventory";
import { getSeedGrowthImagePath, SEED_NAMES } from "@/src/garden/assets";

export default function GardenPage() {
  const [garden, setGarden] = useState<Awaited<ReturnType<typeof getGarden>>>(null);
  const [inventory, setInventory] = useState<Awaited<ReturnType<typeof getInventoryState>> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [plantingSeedId, setPlantingSeedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [g, inv] = await Promise.all([getGarden(), getInventoryState()]);
      setGarden(g);
      setInventory(inv);
    } catch {
      setGarden(null);
      setInventory(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      showMessage("澆水成功");
      load();
    } else {
      showMessage(result.message ?? "澆水失敗");
    }
  }, [load]);

  const handleFertilize = useCallback(
    async (type: "basic" | "premium") => {
      const result = await fertilize(type);
      if (result.success) {
        showMessage(type === "basic" ? "施用一般肥料成功" : "施用高級肥料成功");
        load();
      } else {
        showMessage(result.message ?? "施肥失敗");
      }
    },
    [load]
  );

  const handleHarvest = useCallback(async () => {
    const result = await harvest();
    if (result.success) {
      showMessage("收成完成，可以再種新種子");
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
          我的花園
        </h1>
        {message && (
          <p className="rounded-xl bg-amber-100 px-4 py-2 text-center font-semibold text-amber-900" role="status">
            {message}
          </p>
        )}
        {!garden && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-center text-gray-600">還沒有植物，選一顆種子種下吧！</p>
            {plantingSeedId ? (
              <div className="flex flex-wrap justify-center gap-3">
                {(inventory?.seeds ?? {})[plantingSeedId] != null && (inventory?.seeds ?? {})[plantingSeedId] > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePlant(plantingSeedId)}
                      className="min-h-[44px] rounded-xl bg-[var(--primary)] px-6 font-semibold text-white hover:bg-[var(--primary-hover)]"
                    >
                      確認種植 {SEED_NAMES[plantingSeedId] ?? plantingSeedId}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlantingSeedId(null)}
                      className="min-h-[44px] rounded-xl border-2 border-gray-300 px-6 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">沒有此種子，請到商店購買</p>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                {["pink_flower", "sun_flower"].map((seedId) => (
                  <button
                    key={seedId}
                    type="button"
                    onClick={() => setPlantingSeedId(seedId)}
                    disabled={((inventory?.seeds ?? {})[seedId] ?? 0) < 1}
                    className="flex flex-col items-center gap-1 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 disabled:opacity-50 hover:border-[var(--primary)] hover:bg-amber-50"
                  >
                    <div className="relative h-14 w-14">
                      <Image
                        src={getSeedGrowthImagePath(seedId, 0)}
                        alt=""
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <span className="text-sm font-semibold">{SEED_NAMES[seedId] ?? seedId}</span>
                    <span className="text-xs text-gray-500">× {(inventory?.seeds ?? {})[seedId] ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {garden && (
          <div className="flex flex-col items-center gap-6 rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-lg font-bold text-[var(--foreground)]">
              {SEED_NAMES[garden.seedId] ?? garden.seedId}
              {garden.isBloom && "（已開花）"}
            </p>
            <div className="relative h-48 w-48 sm:h-56 sm:w-56">
              <Image
                src={getSeedGrowthImagePath(garden.seedId, garden.growthStage)}
                alt=""
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            {!garden.isBloom && (
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={handleWater}
                  disabled={(inventory?.water ?? 0) < 1}
                  className="min-h-[44px] rounded-xl bg-blue-100 px-6 font-semibold text-blue-800 disabled:opacity-50 hover:bg-blue-200"
                >
                  澆水（水 × {inventory?.water ?? 0}）
                </button>
                <button
                  type="button"
                  onClick={() => handleFertilize("basic")}
                  disabled={(inventory?.fertilizerBasic ?? 0) < 1}
                  className="min-h-[44px] rounded-xl bg-amber-100 px-6 font-semibold text-amber-800 disabled:opacity-50 hover:bg-amber-200"
                >
                  一般肥料（× {inventory?.fertilizerBasic ?? 0}）
                </button>
                <button
                  type="button"
                  onClick={() => handleFertilize("premium")}
                  disabled={(inventory?.fertilizerPremium ?? 0) < 1}
                  className="min-h-[44px] rounded-xl bg-purple-100 px-6 font-semibold text-purple-800 disabled:opacity-50 hover:bg-purple-200"
                >
                  高級肥料（× {inventory?.fertilizerPremium ?? 0}）
                </button>
              </div>
            )}
            {garden.isBloom && (
              <button
                type="button"
                onClick={handleHarvest}
                className="min-h-[44px] rounded-xl bg-[var(--primary)] px-6 font-semibold text-white hover:bg-[var(--primary-hover)]"
              >
                收成（可再種新種子）
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
