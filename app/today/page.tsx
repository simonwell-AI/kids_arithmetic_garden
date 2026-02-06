"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QuestionCard } from "@/src/components/QuestionCard";
import { NumericKeypad } from "@/src/components/NumericKeypad";
import { FeedbackToast } from "@/src/components/FeedbackToast";
import { CelebrationParticles } from "@/src/components/CelebrationParticles";
import { generateTodayQuestions } from "@/src/generator";
import type { Question } from "@/src/generator";
import {
  getTodayDateString,
  getTodayProgress,
  TODAY_SET_SIZE,
} from "@/src/persistence/dailyProgress";
import { advanceDailyProgressAndClaimReward } from "@/src/persistence/dailyReward";
import { playFeedbackSound, playCelebrationSound } from "@/src/lib/sound";
import { speakText, stopSpeaking } from "@/src/lib/speech";

export default function TodayTaskPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastTimeMs, setLastTimeMs] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [phase, setPhase] = useState<"loading" | "questions" | "done" | "already">("loading");

  const dateKey = useMemo(() => getTodayDateString(), []);
  const question = questions[index];

  const questionSpeechText = useMemo(() => {
    if (!question) return "";
    switch (question.op) {
      case "add":
        return `${question.a} 加 ${question.b} 等於多少`;
      case "sub":
        return `${question.a} 減 ${question.b} 等於多少`;
      case "mul":
        return `${question.a} 乘以 ${question.b} 等於多少`;
      case "div":
        return `${question.a} 除以 ${question.b} 等於多少`;
      default:
        return `${question.a} 加 ${question.b} 等於多少`;
    }
  }, [question]);

  const handleSpeak = useCallback(() => {
    if (!questionSpeechText) return;
    stopSpeaking();
    speakText(questionSpeechText);
  }, [questionSpeechText]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const progress = await getTodayProgress();
      if (progress.completed >= TODAY_SET_SIZE) {
        if (!cancelled) setPhase("already");
        return;
      }
      const qs = generateTodayQuestions(dateKey, TODAY_SET_SIZE);
      if (!cancelled) {
        setQuestions(qs);
        setStartIndex(progress.completed);
        setIndex(progress.completed);
        setStartedAt(Date.now());
        setPhase("questions");
      }
    })();
    return () => { cancelled = true; };
  }, [dateKey]);

  const handleSubmit = useCallback(async () => {
    if (!question || phase !== "questions") return;
    const num = parseInt(value, 10);
    const correct = num === question.answer;
    const elapsed = Date.now() - startedAt;
    playFeedbackSound(correct);
    setLastCorrect(correct);
    setLastTimeMs(elapsed);
    setShowFeedback(true);
    const result = await advanceDailyProgressAndClaimReward();
    const reward = result.reward;
    if (result.justCompleted) {
      setShowCelebration(true);
      playCelebrationSound();
      setTimeout(() => setShowCelebration(false), 3000);
    }
    if (reward?.claimed && reward.rewardAmount > 0) {
      const msg =
        reward.streakBonus > 0
          ? `今日任務完成！獲得 ${reward.rewardAmount} 代幣！（含連續 7 天獎勵 +${reward.streakBonus}）`
          : `今日任務完成！獲得 ${reward.rewardAmount} 代幣！`;
      setRewardMessage(msg);
      setTimeout(() => setRewardMessage(null), 4000);
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

  if (phase === "loading") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--background)] px-4">
        <p className="text-gray-600">載入今日題目…</p>
      </div>
    );
  }

  if (phase === "already") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--background)] px-4 py-8">
        <div className="flex max-w-md flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-lg">
          <h2 className="text-xl font-bold text-[var(--foreground)]">今日任務已完成</h2>
          <p className="text-center text-gray-600">你今天已經完成今日題組，明天再來吧！</p>
          <Link
            href="/"
            className="min-h-[52px] rounded-full bg-[var(--primary)] px-8 font-bold text-white shadow-md transition hover:bg-[var(--primary-hover)] active:scale-[0.98]"
          >
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--background)] px-4 py-8">
        <div className="flex max-w-md flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-lg">
          <h2 className="text-xl font-bold text-[var(--foreground)]">今日任務完成！</h2>
          <p className="text-center text-gray-600">你已完成今日 {TODAY_SET_SIZE} 題，太棒了！</p>
          {rewardMessage && (
            <p className="rounded-xl bg-amber-100 px-4 py-2 font-bold text-amber-900">{rewardMessage}</p>
          )}
          <Link
            href="/"
            className="min-h-[52px] rounded-full bg-[var(--primary)] px-8 font-bold text-white shadow-md transition hover:bg-[var(--primary-hover)] active:scale-[0.98]"
          >
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-10">
      {showCelebration && <CelebrationParticles />}
      <div className="flex w-full max-w-lg flex-col items-center gap-6">
        <div className="flex w-full items-center justify-between">
          <Link href="/" className="font-semibold text-[var(--primary)] hover:underline">
            ← 返回首頁
          </Link>
          <span className="text-sm font-bold text-amber-800">
            今日任務 {index + 1} / {TODAY_SET_SIZE}
          </span>
        </div>
        <h1 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">
          今日題組
        </h1>
        {question && (
          <>
            <button
              type="button"
              onClick={handleSpeak}
              className="self-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
            >
              🔊 朗讀題目
            </button>
            <QuestionCard question={question} answerInput={value} />
            <NumericKeypad
              value={value}
              onChange={setValue}
              onSubmit={handleSubmit}
              disabled={showFeedback}
            />
            {showFeedback && (
              <FeedbackToast
                correct={lastCorrect}
                responseTimeMs={lastTimeMs}
                onDismiss={handleDismissFeedback}
              />
            )}
            {rewardMessage && (
              <div
                className="fixed left-1/2 top-4 z-20 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl bg-amber-400 px-4 py-3 text-center font-bold text-amber-950 shadow-lg"
                role="status"
              >
                {rewardMessage}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
