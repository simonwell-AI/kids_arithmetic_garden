"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCoins, addCoins } from "@/src/persistence";
import { SHOP_CATALOG, SHOP_CATEGORIES, DEFAULT_BACKPACK_IMAGE } from "@/src/shop/catalog";
import { purchaseItem, getInventoryCounts, TOOL_DISPLAY_NAMES, WATERING_CAN_DISPLAY_NAMES, BACKPACK_DISPLAY_NAMES } from "@/src/shop/purchase";
import { setSelectedBackpack } from "@/src/persistence/inventory";
import { getSeedIconPath } from "@/src/garden/assets";
import type { ShopItem } from "@/src/shop/catalog";
import { playPurchaseSound } from "@/src/lib/sound";

const COIN_IMAGE = "/garden-assets/coins/coin.png";

const BACKPACK_IMAGE_PATHS: Record<string, string> = {
  green_backpack: "/garden-assets/Backpack/green_backpack.png",
  classic_backpack: "/garden-assets/Backpack/classic_backpack.png",
  cute_bear_backpack: "/garden-assets/Backpack/cute_bear_backpack.png",
};

function getShopItemIcon(item: ShopItem): string {
  if (item.type === "seed" && item.seedId) return getSeedIconPath(item.seedId);
  if (item.type === "water") return "/garden-assets/gargen_tools/water.png";
  if (item.type === "fertilizer_basic") return "/garden-assets/gargen_tools/normal fertilizer.png";
  if (item.type === "fertilizer_premium") return "/garden-assets/gargen_tools/Advanced_fertilizer.png";
  if (item.type === "backpack_expand") return DEFAULT_BACKPACK_IMAGE;
  if (item.type === "tool" && item.toolImagePath) return item.toolImagePath;
  if (item.type === "watering_can" && item.wateringCanImagePath) return item.wateringCanImagePath;
  if (item.type === "backpack" && item.backpackImagePath) return item.backpackImagePath;
  return COIN_IMAGE;
}

function getItemsByCategory(catalog: ShopItem[]) {
  return SHOP_CATEGORIES.map((cat) => ({
    ...cat,
    items: catalog.filter((item) => cat.types.includes(item.type)),
  })).filter((group) => group.items.length > 0);
}

export default function ShopPage() {
  const [coins, setCoins] = useState<number | null>(null);
  const [inventory, setInventory] = useState<Awaited<ReturnType<typeof getInventoryCounts>> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [coinNumberPop, setCoinNumberPop] = useState(false);
  const prevCoinsRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, inv] = await Promise.all([getCoins(), getInventoryCounts()]);
      setCoins(c);
      setInventory(inv);
    } catch {
      setCoins(0);
      setInventory({
        water: 0,
        fertilizerBasic: 0,
        fertilizerPremium: 0,
        seeds: {},
        tools: {},
        wateringCans: {},
        backpacks: {},
        used: 0,
        capacity: 5,
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (coins != null && coins !== prevCoinsRef.current) {
      prevCoinsRef.current = coins;
      setCoinNumberPop(true);
      const t = setTimeout(() => setCoinNumberPop(false), 420);
      return () => clearTimeout(t);
    }
  }, [coins]);

  const handleAddTestCoins = useCallback(async () => {
    await addCoins(100);
    load();
  }, [load]);

  const handleBuy = useCallback(
    async (item: ShopItem) => {
      if (coins != null && coins < item.price) {
        setMessage("代幣不足");
        setMessageType("error");
        setTimeout(() => setMessage(null), 2000);
        return;
      }
      const result = await purchaseItem(item);
      if (result.success) {
        setMessage(`購買成功：${item.name}`);
        setMessageType("success");
        playPurchaseSound();
        load();
      } else {
        setMessage(result.message ?? "購買失敗");
        setMessageType("error");
      }
      setTimeout(() => setMessage(null), 2000);
    },
    [coins, load]
  );

  const backpackFull = inventory != null && inventory.used >= inventory.capacity;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex w-full max-w-lg flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/" className="font-semibold text-[var(--primary)] hover:underline">
            ← 返回首頁
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddTestCoins}
              className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-200"
            >
              加值 100（測試）
            </button>
            <span className="flex min-w-0 items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2 font-bold text-amber-800 shadow-sm">
            <Image src={COIN_IMAGE} alt="" width={24} height={24} className="shrink-0 object-contain animate-coin-pulse" unoptimized />
            <span className="shrink-0">代幣：</span>
            <span
              className={`min-w-[1.5rem] shrink-0 text-right tabular-nums ${coinNumberPop ? "animate-coin-number-pop" : ""}`}
            >
              {coins ?? 0}
            </span>
          </span>
          </div>
        </div>
        <h1 className="text-center text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
          商店
        </h1>
        {message && (
          <div
            className={`fixed left-1/2 top-1/2 z-30 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl px-5 py-4 text-center text-base font-bold shadow-xl ${
              messageType === "success"
                ? "bg-emerald-500 text-white"
                : "bg-rose-500 text-white"
            }`}
            role="status"
          >
            {message}
          </div>
        )}
        {inventory && (
          <div className="flex items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-20">
              <Image
                src={BACKPACK_IMAGE_PATHS[inventory.selectedBackpackId ?? "green_backpack"] ?? DEFAULT_BACKPACK_IMAGE}
                alt=""
                fill
                className="object-contain transition-transform duration-300 hover:scale-110"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="mb-1 text-sm font-bold text-gray-700">我的背包</h2>
              <p className="mb-2 text-xs font-medium text-gray-500">
                已用 {inventory.used} / 容量 {inventory.capacity}
              </p>
              <p className="mb-2 text-xs text-gray-500">
                選擇背包：
                {(["green_backpack", "classic_backpack", "cute_bear_backpack"] as const).map((id) => {
                  const owned = id === "green_backpack" || (inventory.backpacks?.[id] ?? 0) > 0;
                  const label = id === "green_backpack" ? "綠色(預設)" : BACKPACK_DISPLAY_NAMES[id] ?? id;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={!owned}
                      onClick={async () => {
                        if (!owned) return;
                        await setSelectedBackpack(id);
                        load();
                      }}
                      className={`mr-1.5 rounded px-2 py-0.5 text-xs font-medium disabled:opacity-40 ${
                        inventory.selectedBackpackId === id ? "bg-[var(--primary)] text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </p>
              <p className="text-sm text-gray-600">
                水 × {inventory.water} · 一般肥料 × {inventory.fertilizerBasic} ·
                高級肥料 × {inventory.fertilizerPremium}
                {Object.entries(inventory.seeds)
                  .filter(([, n]) => n > 0)
                  .map(([id, n]) => {
                    const name = SHOP_CATALOG.find((i) => i.type === "seed" && i.seedId === id)?.name ?? id;
                    return ` · ${name} × ${n}`;
                  })}
                {Object.entries(inventory.tools ?? {})
                  .filter(([, n]) => n > 0)
                  .map(([id, n]) => (
                    <span key={id}> · {TOOL_DISPLAY_NAMES[id] ?? id} × {n}</span>
                  ))}
                {Object.entries(inventory.wateringCans ?? {})
                  .filter(([, n]) => n > 0)
                  .map(([id, n]) => (
                    <span key={id}> · {WATERING_CAN_DISPLAY_NAMES[id] ?? id} × {n}</span>
                  ))}
                {Object.entries(inventory.backpacks ?? {})
                  .filter(([, n]) => n > 0)
                  .map(([id, n]) => (
                    <span key={id}> · {BACKPACK_DISPLAY_NAMES[id] ?? id} × {n}</span>
                  ))}
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-8">
          {getItemsByCategory(SHOP_CATALOG).map(({ key, label, items }) => (
            <section key={key} className="flex flex-col gap-3">
              <h2 className="border-b-2 border-[var(--primary)] pb-1.5 text-lg font-bold text-[var(--foreground)]">
                {label}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="shop-product-card flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-amber-200 hover:shadow-lg"
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div className="shop-product-image-wrap relative h-12 w-12 shrink-0 overflow-hidden rounded-lg transition-transform duration-200">
                        <Image
                          src={getShopItemIcon(item)}
                          alt=""
                          fill
                          className="object-contain animate-product-image-float"
                          unoptimized
                        />
                      </div>
                      <span className="font-bold text-[var(--foreground)]">{item.name}</span>
                    </div>
                    <span className="mb-3 flex items-center gap-1.5 text-sm text-gray-600">
                      <Image src={COIN_IMAGE} alt="" width={18} height={18} className="object-contain animate-coin-pulse" unoptimized />
                      {item.price} 代幣
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBuy(item)}
                      disabled={
                        coins != null &&
                        (coins < item.price ||
                          (item.type !== "backpack_expand" && backpackFull))
                      }
                      className="mt-auto min-h-[44px] rounded-xl bg-[var(--primary)] px-4 font-semibold text-white transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--primary-hover)]"
                    >
                      購買
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
