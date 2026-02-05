"use client";

export interface FeedbackToastProps {
  correct: boolean;
  responseTimeMs: number;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function FeedbackToast({
  correct,
  responseTimeMs,
  onDismiss,
  onRetry,
}: FeedbackToastProps) {
  const sec = (responseTimeMs / 1000).toFixed(1);
  return (
    <div
      className={`fixed left-1/2 top-1/2 z-10 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl px-6 py-5 text-center shadow-xl sm:max-w-md sm:px-8 sm:py-6 md:max-w-lg md:px-10 md:py-8 ${
        correct
          ? "bg-[var(--success)] text-white animate-celebrate-pop"
          : "bg-[var(--error)] text-white"
      }`}
      role="alert"
    >
      <p className={`text-xl font-bold sm:text-2xl md:text-3xl ${correct ? "animate-sparkle" : ""}`}>
        {correct ? "答對了！" : "再試一次"}
      </p>
      <p className="mt-1 text-base opacity-90 sm:text-lg md:text-xl">{sec} 秒</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {!correct && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[44px] rounded-xl bg-white/30 px-5 py-2.5 font-semibold hover:bg-white/40 touch-manipulation"
          >
            再試一次
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[44px] rounded-xl bg-white/20 px-5 py-2.5 font-semibold hover:bg-white/30 touch-manipulation"
          >
            下一題
          </button>
        )}
      </div>
    </div>
  );
}
