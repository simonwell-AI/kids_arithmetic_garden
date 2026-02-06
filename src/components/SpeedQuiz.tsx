"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QuestionCard } from "@/src/components/QuestionCard";
import { NumericKeypad } from "@/src/components/NumericKeypad";
import { FeedbackToast } from "@/src/components/FeedbackToast";
import type { Question } from "@/src/generator";
import { playFeedbackSound } from "@/src/lib/sound";

const DURATION_MS = 60 * 1000;
const TOTAL_QUESTIONS = 81;

function buildTimesTableQuestions(): Question[] {
  const qs: Question[] = [];
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      qs.push({
        a,
        b,
        op: "mul",
        answer: a * b,
        skillKey: `mul_${a}x${b}`,
      });
    }
  }
  return qs.sort(() => Math.random() - 0.5);
}

export function SpeedQuiz() {
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [timeLeftMs, setTimeLeftMs] = useState(DURATION_MS);
  const [questions] = useState(() => buildTimesTableQuestions());
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastTimeMs, setLastTimeMs] = useState(0);
  const [startedAt, setStartedAt] = useState(0);

  const question = questions[index];

  useEffect(() => {
    if (phase !== "playing" || timeLeftMs <= 0) return;
    const t = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (prev <= 1000) {
          setPhase("done");
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, timeLeftMs]);

  const handleStart = useCallback(() => {
    setPhase("playing");
    setTimeLeftMs(DURATION_MS);
    setIndex(0);
    setValue("");
    setCorrectCount(0);
    setShowFeedback(false);
    setStartedAt(Date.now());
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!question || phase !== "playing") return;
    const num = parseInt(value, 10);
    const correct = num === question.answer;
    const elapsed = Date.now() - (startedAt || Date.now());
    playFeedbackSound(correct);
    setLastCorrect(correct);
    setLastTimeMs(elapsed);
    setShowFeedback(true);
    if (correct) {
      setCorrectCount((c) => c + 1);
    }
  }, [question, value, phase, startedAt]);

  const handleDismissFeedback = useCallback(() => {
    setShowFeedback(false);
    setValue("");
    if (index >= questions.length - 1) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setStartedAt(Date.now());
  }, [index, questions.length]);

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <h2 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">
          速度測驗（60 秒）
        </h2>
        <p className="text-center text-gray-600">
          60 秒內盡量答對更多乘法題
        </p>
        <button
          type="button"
          onClick={handleStart}
          className="min-h-[52px] rounded-xl bg-amber-400 px-8 text-lg font-bold text-amber-950 shadow hover:bg-amber-500 active:scale-[0.98] touch-manipulation"
        >
          開始
        </button>
      </div>
    );
  }

  if (phase === "done") {
    const totalAnswered = index + (showFeedback ? 0 : 1);
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <h2 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">
          時間到！
        </h2>
        <p className="text-2xl font-bold text-[var(--primary)]">
          答對 {correctCount} 題
        </p>
        <p className="text-gray-600">正確率 {accuracy}%</p>
        <button
          type="button"
          onClick={handleStart}
          className="min-h-[48px] rounded-xl bg-[var(--primary)] px-6 font-bold text-white hover:bg-[var(--primary-hover)] touch-manipulation"
        >
          再玩一次
        </button>
      </div>
    );
  }

  const timeLeft = Math.ceil(timeLeftMs / 1000);
  const timePct = Math.max(0, Math.min(100, (timeLeftMs / DURATION_MS) * 100));

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6">
      <div className="w-full rounded-2xl bg-white/70 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-full bg-amber-100 px-4 py-1 text-sm font-bold text-amber-800">
            ⏱ {timeLeft} 秒
          </span>
          <span className="rounded-full bg-blue-100 px-4 py-1 text-sm font-bold text-blue-800">
            ✅ 答對 {correctCount} 題
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-amber-100">
          <div
            className="h-full rounded-full bg-amber-400 transition-all duration-300"
            style={{ width: `${timePct}%` }}
          />
        </div>
      </div>
      {question && (
        <>
          <div className="w-full rounded-2xl bg-white/80 p-5 shadow-lg">
            <QuestionCard question={question} answerInput={value} />
          </div>
          <NumericKeypad
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            disabled={showFeedback}
          />
        </>
      )}
      {showFeedback && (
        <FeedbackToast
          correct={lastCorrect}
          responseTimeMs={lastTimeMs}
          onDismiss={handleDismissFeedback}
        />
      )}
    </div>
  );
}
