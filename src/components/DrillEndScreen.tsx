"use client";

export interface DrillEndScreenProps {
  correctCount: number;
  totalCount: number;
  avgTimeMs: number;
  onRetryWrong: () => void;
  onNewDrill: () => void;
  onGoHome: () => void;
}

export function DrillEndScreen({
  correctCount,
  totalCount,
  avgTimeMs,
  onRetryWrong,
  onNewDrill,
  onGoHome,
}: DrillEndScreenProps) {
  const accuracy =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const avgSec = (avgTimeMs / 1000).toFixed(1);

  return (
    <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl bg-white p-6 shadow-lg sm:max-w-lg sm:gap-6 sm:p-8 md:max-w-xl md:p-10">
      <h2 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl md:text-3xl">
        練習結束
      </h2>
      <div className="grid grid-cols-2 gap-3 text-center sm:gap-4 md:gap-5">
        <div className="rounded-xl bg-gray-50 p-3 sm:p-4 md:p-5">
          <p className="text-2xl font-bold text-[var(--primary)] sm:text-3xl md:text-4xl">
            {accuracy}%
          </p>
          <p className="text-xs font-semibold text-gray-600 sm:text-sm md:text-base">正確率</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 sm:p-4 md:p-5">
          <p className="text-2xl font-bold text-[var(--primary)] sm:text-3xl md:text-4xl">
            {avgSec}s
          </p>
          <p className="text-xs font-semibold text-gray-600 sm:text-sm md:text-base">平均時間</p>
        </div>
      </div>
      <p className="text-center text-base text-gray-700 sm:text-lg md:text-xl">
        {correctCount} / {totalCount} 題正確
      </p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onRetryWrong}
          className="min-h-[48px] rounded-xl bg-amber-400 px-6 py-4 text-lg font-bold text-amber-950 shadow transition hover:bg-amber-500 active:scale-[0.98] touch-manipulation md:min-h-[52px] md:text-xl"
        >
          再練錯題
        </button>
        <button
          type="button"
          onClick={onNewDrill}
          className="min-h-[48px] rounded-xl bg-[var(--primary)] px-6 py-4 text-lg font-bold text-white shadow transition hover:bg-[var(--primary-hover)] active:scale-[0.98] touch-manipulation md:min-h-[52px] md:text-xl"
        >
          再來一輪
        </button>
        <button
          type="button"
          onClick={onGoHome}
          className="min-h-[48px] rounded-xl border-2 border-gray-300 px-6 py-4 text-lg font-bold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] touch-manipulation md:min-h-[52px] md:text-xl"
        >
          回首頁
        </button>
      </div>
    </div>
  );
}
