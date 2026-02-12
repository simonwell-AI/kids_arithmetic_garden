"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getWeaknessStats, type WeaknessItem } from "@/src/persistence";

export function WeaknessSummary() {
  const [items, setItems] = useState<WeaknessItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const list = await getWeaknessStats(5);
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || items.length === 0) return null;

  return (
    <div className="w-full max-w-md rounded-2xl border-2 border-gray-200 bg-gray-50/80 p-4 shadow-sm sm:p-5">
      <h2 className="mb-2 flex items-center justify-center gap-2 text-center text-lg font-bold text-gray-800 sm:text-xl">
        📊 我的弱項
      </h2>
      <p className="mb-3 text-center text-xs text-gray-600">
        常錯題型（答過至少 2 題且曾答錯）
      </p>
      <ul className="mb-3 space-y-1.5 text-sm">
        {items.map((item) => (
          <li
            key={item.skillKey}
            className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm"
          >
            <span className="font-mono font-semibold text-gray-800">{item.displayText}</span>
            <span className="text-gray-500">
              錯 {item.wrong}/{item.total}（{Math.round(item.wrongRate * 100)}%）
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/drill"
        className="block w-full min-h-[44px] rounded-xl bg-gray-200 px-4 py-3 text-center font-bold text-gray-800 hover:bg-gray-300 active:scale-[0.98] touch-manipulation"
      >
        去練習題練錯題
      </Link>
    </div>
  );
}
