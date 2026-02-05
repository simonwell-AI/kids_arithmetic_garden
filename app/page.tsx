"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { exportToJson, importFromJson, downloadExport, getCoins } from "@/src/persistence";
import { TodayTask } from "@/src/components/TodayTask";

const COIN_IMAGE = "/garden-assets/coins/coin.png";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    getCoins().then(setCoins).catch(() => setCoins(0));
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const json = await exportToJson();
      const blob = new Blob([json], { type: "application/json" });
      downloadExport(blob);
    } catch (e) {
      console.warn("Export failed", e);
    }
  }, []);

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await importFromJson(text, false);
        window.location.reload();
      } catch (err) {
        console.warn("Import failed", err);
      }
      e.target.value = "";
    },
    []
  );

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--background)] px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
      <main className="flex w-full max-w-md flex-col items-center gap-8 sm:max-w-lg sm:gap-10 md:max-w-xl md:gap-12">
        <Image
          src="/podium.png"
          alt="算術練習"
          width={180}
          height={140}
          className="h-auto w-40 object-contain sm:w-44 md:w-48"
          priority
          unoptimized
        />
        <h1 className="text-center text-3xl font-bold text-[var(--foreground)] sm:text-4xl md:text-5xl">
          算術練習
        </h1>
        <p className="text-center text-base text-[var(--foreground)]/80 sm:text-lg md:text-xl">
          選一個模式開始練習吧！
        </p>
        <div className="flex w-full max-w-md items-center justify-center gap-4 sm:max-w-lg">
          <span className="flex items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2 font-bold text-amber-800 shadow-sm">
            <Image src={COIN_IMAGE} alt="" width={24} height={24} className="object-contain animate-coin-pulse" unoptimized />
            代幣：{coins ?? "…"}
          </span>
          <Link href="/shop" className="rounded-xl border-2 border-[var(--primary)] bg-white px-4 py-2 font-semibold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white">
            商店
          </Link>
          <Link href="/garden" className="rounded-xl border-2 border-green-300 bg-white px-4 py-2 font-semibold text-green-700 hover:bg-green-100">
            我的花園
          </Link>
        </div>
        <TodayTask />
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:justify-center sm:gap-6">
          <Link
            href="/today"
            className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl border-2 border-amber-400 bg-amber-100 px-6 py-5 text-lg font-bold text-amber-900 shadow-lg transition-all hover:bg-amber-200 active:scale-[0.98] sm:min-h-[64px] sm:max-w-[200px] sm:py-6 sm:text-xl md:min-h-[72px]"
          >
            開始今日任務
          </Link>
          <Link
            href="/drill"
            className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl bg-[var(--primary)] px-6 py-5 text-lg font-bold text-white shadow-lg transition-all hover:bg-[var(--primary-hover)] active:scale-[0.98] sm:min-h-[64px] sm:max-w-[200px] sm:py-6 sm:text-xl md:min-h-[72px]"
          >
            練習題
          </Link>
          <Link
            href="/times-table"
            className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl bg-amber-400 px-6 py-5 text-lg font-bold text-amber-950 shadow-lg transition-all hover:bg-amber-500 active:scale-[0.98] sm:min-h-[64px] sm:max-w-[200px] sm:py-6 sm:text-xl md:min-h-[72px]"
          >
            九九乘法
          </Link>
        </div>
        <div className="mt-4 flex w-full max-w-sm flex-col gap-2 text-sm text-gray-600 sm:mt-6 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleExport}
            className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 py-3 font-semibold hover:bg-gray-50 touch-manipulation sm:px-5"
          >
            匯出資料 (JSON)
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 py-3 font-semibold hover:bg-gray-50 touch-manipulation sm:px-5"
          >
            匯入資料 (覆寫)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </main>
    </div>
  );
}
