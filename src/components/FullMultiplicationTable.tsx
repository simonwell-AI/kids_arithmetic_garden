"use client";

import { useCallback, useEffect, useState } from "react";
import { speakFullMultiplicationTable, speakTimesTable, stopSpeaking, isSpeaking } from "@/src/lib/speech";

const COLUMN_BGS = [
  "bg-pink-100",
  "bg-amber-100",
  "bg-lime-100",
  "bg-sky-100",
  "bg-violet-100",
  "bg-rose-100",
  "bg-emerald-100",
  "bg-teal-100",
] as const;

export function FullMultiplicationTable() {
  const [speaking, setSpeaking] = useState(false);
  const [highlightedCell, setHighlightedCell] = useState<{ a: number; b: number } | null>(null);

  const handleReadAll = useCallback(() => {
    if (speaking) return;
    setSpeaking(true);
    setHighlightedCell(null);
    speakFullMultiplicationTable(
      () => {
        setSpeaking(false);
        setHighlightedCell(null);
      },
      (a, b) => setHighlightedCell({ a, b })
    );
  }, [speaking]);

  const handleStop = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
    setHighlightedCell(null);
  }, []);

  const handleReadColumn = useCallback(
    (a: number) => {
      if (speaking) return;
      setSpeaking(true);
      setHighlightedCell(null);
      speakTimesTable(
        a,
        () => {
          setSpeaking(false);
          setHighlightedCell(null);
        },
        (ax, b) => setHighlightedCell({ a: ax, b })
      );
    },
    [speaking]
  );

  useEffect(() => {
    const check = () => setSpeaking(isSpeaking());
    const id = setInterval(check, 400);
    return () => {
      clearInterval(id);
      stopSpeaking();
    };
  }, []);

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6">
      <h1 className="text-center text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
        九九乘法表 (2~9)
      </h1>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleReadAll}
          disabled={speaking}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-[var(--primary)] bg-[var(--primary)] px-4 py-2.5 font-semibold text-white shadow transition disabled:opacity-60 hover:bg-[var(--primary-hover)] active:scale-[0.98]"
          aria-label="朗讀整張表"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          朗讀整張表
        </button>
        <button
          type="button"
          onClick={handleStop}
          disabled={!speaking}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-300 bg-gray-100 px-4 py-2.5 font-semibold text-gray-700 shadow transition disabled:opacity-50 hover:bg-gray-200 active:scale-[0.98]"
          aria-label="停止"
        >
          停止
        </button>
        <span className="text-sm text-gray-600">
          點一下可聽完整 2~9 乘法表
        </span>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8">
        {[2, 3, 4, 5, 6, 7, 8, 9].map((a, idx) => (
          <div
            key={a}
            className={`flex flex-col rounded-2xl p-3 shadow-sm ${COLUMN_BGS[idx]}`}
          >
            <div className="mb-2 flex items-center justify-center gap-1.5">
              <span className="text-2xl font-bold text-[var(--primary)] sm:text-3xl">
                {a}
              </span>
              <button
                type="button"
                onClick={() => handleReadColumn(a)}
                disabled={speaking}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow transition hover:bg-[var(--primary-hover)] disabled:opacity-50 active:scale-95"
                aria-label={`朗讀 ${a} 的乘法`}
                title={`朗讀 ${a} 的乘法`}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              </button>
            </div>
            <ul className="flex flex-col gap-0.5 text-lg text-[var(--foreground)] sm:gap-1 sm:text-base">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((b) => {
                const isHighlighted = highlightedCell?.a === a && highlightedCell?.b === b;
                return (
                  <li
                    key={b}
                    className={`flex items-center justify-center gap-0.5 rounded-md px-1 py-0.5 font-bold transition-colors duration-150 sm:justify-center sm:gap-1 sm:py-0.5 ${
                      isHighlighted ? "bg-amber-300 text-amber-950 shadow-sm" : ""
                    }`}
                  >
                    <span className="w-5 text-right tabular-nums sm:w-5">{a}</span>
                    <span className="shrink-0">×</span>
                    <span className="w-5 text-right tabular-nums sm:w-5">{b}</span>
                    <span className="shrink-0">=</span>
                    <span className="w-7 text-right tabular-nums sm:w-8">{a * b}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
