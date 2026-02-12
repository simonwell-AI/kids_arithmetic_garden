"use client";

import { useEffect, useRef } from "react";
import { speakText } from "@/src/lib/speech";

export interface FeedbackToastProps {
  correct: boolean;
  responseTimeMs: number;
  /** 答錯時顯示並可朗讀的正確答案 */
  correctAnswer?: number;
  /** 答錯時是否朗讀「正確答案是 ○○」 */
  speakCorrectAnswer?: boolean;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function FeedbackToast({
  correct,
  responseTimeMs,
  correctAnswer,
  speakCorrectAnswer = false,
  onDismiss,
  onRetry,
}: FeedbackToastProps) {
  const sec = (responseTimeMs / 1000).toFixed(1);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!correct && correctAnswer != null && speakCorrectAnswer) {
      speakText(`答案是 ${correctAnswer}，下一題加油`);
    }
  }, [correct, correctAnswer, speakCorrectAnswer]);

  useEffect(() => {
    const btn = !correct && onRetry ? retryRef.current : dismissRef.current;
    btn?.focus();
  }, [correct, onRetry]);

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
        {correct ? "答對了！" : "答錯了，沒關係～"}
      </p>
      <p className="mt-1 text-base opacity-90 sm:text-lg md:text-xl">{sec} 秒</p>
      {!correct && correctAnswer != null && (
        <p className="mt-2 text-lg font-semibold opacity-95 sm:text-xl">
          答案是 {correctAnswer}，下一題加油～
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {!correct && onRetry && (
          <button
            ref={retryRef}
            type="button"
            onClick={onRetry}
            className="min-h-[44px] rounded-xl bg-white/30 px-5 py-2.5 font-semibold hover:bg-white/40 touch-manipulation"
          >
            再試一次
          </button>
        )}
        {onDismiss && (
          <button
            ref={dismissRef}
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
