"use client";

import { useState } from "react";
import type { OperationOption, Difficulty } from "@/src/generator";

export interface DrillSettingsState {
  operation: OperationOption;
  rangeMin: number;
  rangeMax: number;
  count: number | null;
  difficulty: Difficulty;
  adaptive: boolean;
  speech: boolean;
}

const DEFAULT_SETTINGS: DrillSettingsState = {
  operation: "add",
  rangeMin: 0,
  rangeMax: 10,
  count: 10,
  difficulty: "normal",
  adaptive: false,
  speech: false,
};

export interface DrillSettingsProps {
  initial?: Partial<DrillSettingsState>;
  onSubmit: (settings: DrillSettingsState) => void;
}

export function DrillSettings({ initial, onSubmit }: DrillSettingsProps) {
  const [op, setOp] = useState<OperationOption>(initial?.operation ?? DEFAULT_SETTINGS.operation);
  const [rangeMax, setRangeMax] = useState(initial?.rangeMax ?? DEFAULT_SETTINGS.rangeMax);
  const [count, setCount] = useState<number | null>(initial?.count ?? DEFAULT_SETTINGS.count);
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? DEFAULT_SETTINGS.difficulty);
  const [adaptive, setAdaptive] = useState(initial?.adaptive ?? DEFAULT_SETTINGS.adaptive);
  const [speech, setSpeech] = useState(initial?.speech ?? DEFAULT_SETTINGS.speech);

  const handleSubmit = () => {
    onSubmit({
      operation: op,
      rangeMin: 0,
      rangeMax,
      count,
      difficulty,
      adaptive,
      speech,
    });
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-6 shadow-lg sm:max-w-lg sm:gap-7 sm:p-8">
      <h2 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">
        練習設定
      </h2>
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">運算</p>
        <div className="flex flex-wrap gap-2">
          {(["add", "sub", "mul", "div", "mixed"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOp(o)}
              className={`min-h-[44px] rounded-xl px-4 font-semibold transition touch-manipulation ${
                op === o
                  ? "bg-[var(--primary)] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {o === "add" ? "＋" : o === "sub" ? "－" : o === "mul" ? "×" : o === "div" ? "÷" : "混合"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">範圍</p>
        <div className="flex flex-wrap gap-2">
          {[10, 20, 50, 100, 200, 500].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRangeMax(r)}
              className={`min-h-[44px] rounded-xl px-4 font-semibold transition touch-manipulation ${
                rangeMax === r
                  ? "bg-[var(--primary)] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              0～{r}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">題數</p>
        <div className="flex flex-wrap gap-2">
          {[10, 20, null].map((c) => (
            <button
              key={c ?? "unlimited"}
              type="button"
              onClick={() => setCount(c)}
              className={`min-h-[44px] rounded-xl px-4 font-semibold transition touch-manipulation ${
                count === c
                  ? "bg-[var(--primary)] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {c == null ? "不限" : c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">難度</p>
        <div className="flex flex-wrap gap-2">
          {(["easy", "normal", "hard"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`min-h-[44px] rounded-xl px-4 font-semibold transition touch-manipulation ${
                difficulty === d
                  ? "bg-[var(--primary)] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {d === "easy" ? "簡單" : d === "normal" ? "普通" : "困難"}
            </button>
          ))}
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={adaptive}
          onChange={(e) => setAdaptive(e.target.checked)}
          className="h-5 w-5 rounded border-gray-300"
        />
        <span className="text-sm font-semibold text-gray-700">自適應（依錯題加強）</span>
      </label>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={speech}
          onChange={(e) => setSpeech(e.target.checked)}
          className="h-5 w-5 rounded border-gray-300"
        />
        <span className="text-sm font-semibold text-gray-700">語音朗讀題目</span>
      </label>
      <button
        type="button"
        onClick={handleSubmit}
        className="min-h-[52px] rounded-xl bg-[var(--primary)] px-6 text-lg font-bold text-white shadow transition hover:bg-[var(--primary-hover)] active:scale-[0.98] touch-manipulation"
      >
        開始練習
      </button>
    </div>
  );
}
