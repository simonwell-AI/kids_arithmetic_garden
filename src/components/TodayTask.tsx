"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { getTodayProgress, getStreak, TODAY_SET_SIZE } from "@/src/persistence/dailyProgress";

export function TodayTask() {
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(TODAY_SET_SIZE);
  const [completedAt, setCompletedAt] = useState<number | undefined>(undefined);
  const [streak, setStreak] = useState(0);

  const load = useCallback(async () => {
    try {
      const [progress, streakCount] = await Promise.all([
        getTodayProgress(),
        getStreak(),
      ]);
      setCompleted(progress.completed);
      setTotal(progress.total);
      setCompletedAt(progress.completedAt);
      setStreak(streakCount);
    } catch {
      setCompleted(0);
      setTotal(TODAY_SET_SIZE);
      setStreak(0);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remaining = Math.max(0, total - completed);
  const done = completed >= total;
  const progressPct = total > 0 ? Math.min(100, (completed / total) * 100) : 0;

  return (
    <div className="w-full max-w-md rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-4 shadow-sm sm:p-5">
      <h2 className="mb-2 flex items-center justify-center gap-2 text-center text-lg font-bold text-amber-900 sm:text-xl">
        📋 今日任務
      </h2>
      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-amber-800">
        <span>今日 {total} 題，已完成 {completed} / {total}</span>
        {done && <span className="text-amber-600">✓ 完成</span>}
      </div>
      <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-amber-200">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      {done ? (
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold text-amber-800">
            今日任務已完成！{completedAt != null && "獲得今日徽章。"}
          </p>
          <p className="text-xs text-amber-700">今天已經完成，明天再來～</p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-center text-sm text-amber-700">
            再 {remaining} 題就完成今日任務！
          </p>
          <p className="mb-3 text-center text-xs text-amber-600">
            完成今日任務可賺代幣養花園～
          </p>
          <Link
            href="/today"
            className="block w-full min-h-[44px] rounded-xl bg-amber-400 px-4 py-3 text-center font-bold text-amber-950 hover:bg-amber-500 active:scale-[0.98] touch-manipulation"
          >
            開始今日任務
          </Link>
        </>
      )}
      {streak > 0 && (
        <div className="mt-2 flex flex-col items-center gap-1 text-amber-700">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-200/80 animate-badge-glow">
              <Image src="/celebration-assets/star-medal.png" alt="獎牌" width={20} height={20} className="object-contain" unoptimized />
            </span>
            已連續 {streak} 天完成
          </div>
          <span className="text-[11px] text-amber-600">連續達成可獲得獎牌加成</span>
        </div>
      )}
    </div>
  );
}
