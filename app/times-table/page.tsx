"use client";

import Link from "next/link";
import { useState } from "react";
import { Flashcard } from "@/src/components/Flashcard";
import { SpeedQuiz } from "@/src/components/SpeedQuiz";
import { FullMultiplicationTable } from "@/src/components/FullMultiplicationTable";

type Mode = "menu" | "flashcard" | "speed" | "fulltable";

export default function TimesTablePage() {
  const [mode, setMode] = useState<Mode>("menu");

  if (mode === "flashcard") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="mb-4 self-start font-semibold text-[var(--primary)] hover:underline"
        >
          ← 返回首頁
        </Link>
        <button
          type="button"
          onClick={() => setMode("menu")}
          className="mb-2 self-start text-sm font-medium text-gray-600 hover:underline"
        >
          ← 選擇模式
        </button>
        <h1 className="mb-6 text-2xl font-bold text-[var(--foreground)]">
          九九乘法閃卡
        </h1>
        <Flashcard />
      </div>
    );
  }

  if (mode === "speed") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="mb-4 self-start font-semibold text-[var(--primary)] hover:underline"
        >
          ← 返回首頁
        </Link>
        <button
          type="button"
          onClick={() => setMode("menu")}
          className="mb-2 self-start text-sm font-medium text-gray-600 hover:underline"
        >
          ← 選擇模式
        </button>
        <h1 className="mb-6 text-2xl font-bold text-[var(--foreground)]">
          九九乘法
        </h1>
        <SpeedQuiz />
      </div>
    );
  }

  if (mode === "fulltable") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="mb-4 self-start font-semibold text-[var(--primary)] hover:underline"
        >
          ← 返回首頁
        </Link>
        <button
          type="button"
          onClick={() => setMode("menu")}
          className="mb-2 self-start text-sm font-medium text-gray-600 hover:underline"
        >
          ← 選擇模式
        </button>
        <FullMultiplicationTable />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link
          href="/"
          className="font-semibold text-[var(--primary)] hover:underline"
        >
          ← 返回首頁
        </Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
          九九乘法
        </h1>
        <p className="text-gray-600">選一個模式</p>
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setMode("fulltable")}
            className="min-h-[56px] rounded-2xl bg-green-100 px-6 py-4 text-lg font-bold text-green-900 shadow transition hover:bg-green-200 active:scale-[0.98] touch-manipulation"
          >
            完整乘法表（2~9，可朗讀）
          </button>
          <button
            type="button"
            onClick={() => setMode("flashcard")}
            className="min-h-[56px] rounded-2xl bg-amber-100 px-6 py-4 text-lg font-bold text-amber-900 shadow transition hover:bg-amber-200 active:scale-[0.98] touch-manipulation"
          >
            閃卡（點擊翻面）
          </button>
          <button
            type="button"
            onClick={() => setMode("speed")}
            className="min-h-[56px] rounded-2xl bg-amber-400 px-6 py-4 text-lg font-bold text-amber-950 shadow transition hover:bg-amber-500 active:scale-[0.98] touch-manipulation"
          >
            速度測驗（60 秒）
          </button>
        </div>
      </div>
    </div>
  );
}
