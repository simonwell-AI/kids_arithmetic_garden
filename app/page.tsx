"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { exportToJson, importFromJson, downloadExport, getCoins } from "@/src/persistence";
import { TodayTask } from "@/src/components/TodayTask";
import { WeaknessSummary } from "@/src/components/WeaknessSummary";

const COIN_IMAGE = "/garden-assets/coins/coin.png";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const [showIntro, setShowIntro] = useState(false);

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
        <section className="w-full max-w-lg rounded-2xl border border-[var(--primary)]/20 bg-white/60 shadow-sm sm:overflow-hidden">
          <button
            type="button"
            onClick={() => setShowIntro((v) => !v)}
            className="flex w-full min-h-[52px] items-center justify-center gap-2 px-4 py-3 text-left transition hover:bg-[var(--primary)]/5 active:scale-[0.99] touch-manipulation sm:min-h-[56px] sm:px-5 sm:py-4"
          >
            <h2 className="text-lg font-bold text-[var(--foreground)] sm:text-xl">
              🌱 Kids Arithmetic Garden｜兒童算術花園
            </h2>
            <span className="shrink-0 text-[var(--primary)]" aria-hidden>
              {showIntro ? "▼" : "▶"}
            </span>
          </button>
          {showIntro && (
            <div className="border-t border-[var(--primary)]/10 px-4 pb-4 pt-2 text-left sm:px-5 sm:pb-5 sm:pt-3">
              <p className="mb-3 text-sm leading-relaxed text-gray-700 sm:text-base">
                Kids Arithmetic Garden 是一個專為國小小朋友設計的算數練習網站，透過簡單、直覺又有趣的方式，幫助孩子練習基礎數學能力。
              </p>
              <p className="mb-2 text-sm font-semibold text-gray-800 sm:text-base">網站主要提供：</p>
              <ul className="mb-3 list-inside list-disc space-y-1 text-sm text-gray-700 sm:text-base">
                <li>➕➖✖️➗ 加、減、乘、除 四則運算練習</li>
                <li>📊 從簡單到進階的題目設計，符合國小學習階段</li>
                <li>🎯 即時作答回饋，幫助孩子快速理解對錯</li>
                <li>🌼 清爽、友善的介面，讓孩子能專心學習、不分心</li>
              </ul>
              <p className="mb-2 text-sm leading-relaxed text-gray-700 sm:text-base">
                Kids Arithmetic Garden 就像一座小小的「算數花園」，讓孩子在反覆練習中慢慢培養：
              </p>
              <ul className="mb-3 list-inside list-disc space-y-1 text-sm text-gray-700 sm:text-base">
                <li>數字敏感度</li>
                <li>計算速度</li>
                <li>對數學的信心與熟悉感</li>
              </ul>
              <p className="text-sm leading-relaxed text-gray-700 sm:text-base">
                適合 國小低年級到中年級 的孩子使用，也很適合家長在家陪孩子一起練習數學。
              </p>
            </div>
          )}
        </section>
        <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:max-w-lg sm:grid-cols-4 sm:gap-4">
          <span className="flex min-w-0 items-center justify-center gap-1 rounded-xl border-2 border-amber-200 bg-amber-50 px-2 py-2 font-bold text-amber-800 shadow-sm sm:gap-2 sm:px-4">
            <Image src={COIN_IMAGE} alt="" width={24} height={24} className="h-5 w-5 shrink-0 object-contain animate-coin-pulse sm:h-6 sm:w-6" unoptimized />
            <span className="truncate text-sm sm:text-base">代幣：</span>
            <span className="min-w-[1.25rem] shrink-0 text-right text-sm tabular-nums sm:text-base">{coins ?? 0}</span>
          </span>
          <Link href="/shop" className="flex min-w-0 items-center justify-center rounded-xl border-2 border-[var(--primary)] bg-white px-2 py-2 text-center font-semibold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white sm:px-4 sm:py-2">
            🏪 商店
          </Link>
          <Link href="/garden" className="flex min-w-0 items-center justify-center rounded-xl border-2 border-green-300 bg-white px-2 py-2 text-center font-semibold text-green-700 hover:bg-green-100 sm:px-4 sm:py-2">
            🌱 我的花園
          </Link>
          <Link href="/insect" className="flex min-w-0 items-center justify-center rounded-xl border-2 border-amber-300 bg-white px-2 py-2 text-center font-semibold text-amber-800 hover:bg-amber-100 sm:px-4 sm:py-2">
            🪲 蟲屋
          </Link>
        </div>
        <TodayTask />
        <WeaknessSummary />
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-6">
          <Link
            href="/drill"
            className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl bg-[var(--primary)] px-6 py-5 text-lg font-bold text-white shadow-lg transition-all hover:bg-[var(--primary-hover)] active:scale-[0.98] sm:min-h-[64px] sm:max-w-[200px] sm:py-6 sm:text-xl md:min-h-[72px]"
          >
            練習題
          </Link>
          <Link
            href="/block"
            className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl bg-emerald-500 px-6 py-5 text-lg font-bold text-white shadow-lg transition-all hover:bg-emerald-600 active:scale-[0.98] sm:min-h-[64px] sm:max-w-[200px] sm:py-6 sm:text-xl md:min-h-[72px]"
          >
            📦 方塊算術
          </Link>
          <Link
            href="/times-table"
            className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl bg-amber-400 px-6 py-5 text-lg font-bold text-amber-950 shadow-lg transition-all hover:bg-amber-500 active:scale-[0.98] sm:min-h-[64px] sm:max-w-[200px] sm:py-6 sm:text-xl md:min-h-[72px]"
          >
            九九乘法
          </Link>
        </div>
        <p className="mt-2 text-center text-xs text-gray-500">
          匯出內容包含答題紀錄，請妥善保管。
        </p>
        <div className="mt-2 flex w-full max-w-sm flex-col gap-2 text-sm text-gray-600 sm:mt-4 sm:flex-row sm:justify-center">
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
