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
  const [wrongIndices, setWrongIndices] = useState<number[]>([]);
  const [retryWrongMode, setRetryWrongMode] = useState(false);
  const [doneFromRetry, setDoneFromRetry] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  const TODAY_SPEECH_KEY = "today_speech_enabled";

  const dateKey = useMemo(() => getTodayDateString(), []);
  const question = questions[index];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(TODAY_SPEECH_KEY);
    setSpeechEnabled(stored !== "false");
  }, []);

  useEffect(() => {
    if (speechEnabled && typeof window !== "undefined") {
      localStorage.setItem(TODAY_SPEECH_KEY, "true");
    } else if (typeof window !== "undefined") {
      localStorage.setItem(TODAY_SPEECH_KEY, "false");
    }
  }, [speechEnabled]);

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
    if (phase !== "questions" || !question || !speechEnabled) return;
    stopSpeaking();
    speakText(questionSpeechText);
  }, [phase, question, speechEnabled, questionSpeechText]);

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
    if (!correct) setWrongIndices((prev) => (prev.includes(index) ? prev : [...prev, index]));
    if (!retryWrongMode) {
      const result = await advanceDailyProgressAndClaimReward(correct);
    const reward = result.reward;
    if (result.justCompleted) {
      if (reward?.thresholdNotMet) {
        setRewardMessage("今日題組已做完，但答對率未達 70%，沒有獎勵喔～明天再加油！");
        setTimeout(() => setRewardMessage(null), 5000);
      } else {
        setShowCelebration(true);
        playCelebrationSound();
        setTimeout(() => setShowCelebration(false), 3000);
      }
    }
    if (reward?.claimed && reward.rewardAmount > 0) {
      let coinMsg =
        reward.streakBonus > 0
          ? `今日任務完成！獲得 ${reward.rewardAmount} 代幣！（含連續 7 天獎勵 +${reward.streakBonus}）`
          : `今日任務完成！獲得 ${reward.rewardAmount} 代幣！`;
      const achievementUnlock = reward && "achievementUnlock" in reward ? (reward as { achievementUnlock?: { todayStreak3JustUnlocked?: boolean; todayStreak7JustUnlocked?: boolean; coinsAwarded: number } }).achievementUnlock : undefined;
      if (achievementUnlock && achievementUnlock.coinsAwarded > 0) {
        const names: string[] = [];
        if (achievementUnlock.todayStreak3JustUnlocked) names.push("今日任務連續 3 天");
        if (achievementUnlock.todayStreak7JustUnlocked) names.push("今日任務連續 7 天");
        coinMsg += ` 成就解鎖：${names.join("、")}！獲得 ${achievementUnlock.coinsAwarded} 代幣。`;
      }
      setRewardMessage(coinMsg);
      setTimeout(() => setRewardMessage(null), 4000);
    }
    }
  }, [question, value, phase, startedAt, index, retryWrongMode]);

  const handleDismissFeedback = useCallback(() => {
    setShowFeedback(false);
    setValue("");
    if (index >= questions.length - 1) {
      setDoneFromRetry(retryWrongMode);
      setPhase("done");
      if (retryWrongMode) setRetryWrongMode(false);
      return;
    }
    setIndex((i) => i + 1);
    setStartedAt(Date.now());
  }, [index, questions.length, retryWrongMode]);

  const handleRetryWrong = useCallback(() => {
    const wrongQuestions = wrongIndices.map((i) => questions[i]).filter(Boolean);
    if (wrongQuestions.length === 0) return;
    setQuestions(wrongQuestions);
    setIndex(0);
    setWrongIndices([]);
    setRetryWrongMode(true);
    setPhase("questions");
    setValue("");
    setShowFeedback(false);
    setRewardMessage(null);
    setStartedAt(Date.now());
  }, [wrongIndices, questions]);

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
    const wrongQuestions = wrongIndices.map((i) => questions[i]).filter(Boolean);
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--background)] px-4 py-8">
        <div className="flex max-w-md flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-lg">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            {doneFromRetry ? "錯題練完了！" : "今日任務完成！"}
          </h2>
          <p className="text-center text-gray-600">
            {doneFromRetry ? "你已練完今日錯題，很棒喔～" : `你已完成今日 ${TODAY_SET_SIZE} 題，太棒了！`}
          </p>
          {rewardMessage && (
            <p className="rounded-xl bg-amber-100 px-4 py-2 font-bold text-amber-900">{rewardMessage}</p>
          )}
          <div className="flex w-full flex-col gap-3">
            {!doneFromRetry && wrongQuestions.length > 0 && (
              <button
                type="button"
                onClick={handleRetryWrong}
                className="min-h-[52px] rounded-full bg-amber-400 px-8 font-bold text-amber-950 shadow-md transition hover:bg-amber-500 active:scale-[0.98]"
              >
                再練錯題（{wrongQuestions.length} 題）
              </button>
            )}
            <Link
              href="/"
              className="min-h-[52px] rounded-full bg-[var(--primary)] px-8 font-bold text-white shadow-md transition hover:bg-[var(--primary-hover)] active:scale-[0.98] text-center flex items-center justify-center"
            >
              返回首頁
            </Link>
          </div>
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
            {retryWrongMode ? `錯題練習 ${index + 1} / ${questions.length}` : `今日任務 ${index + 1} / ${TODAY_SET_SIZE}`}
          </span>
        </div>
        <h1 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">
          今日題組
        </h1>
        <p className="text-center text-sm text-gray-600">
          答錯也會前進到下一題，會顯示正確答案幫助學習。答對率達 70% 才能領取今日獎勵喔！
        </p>
        {question && (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleSpeak}
                className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
              >
                🔊 朗讀題目
              </button>
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm">
                <input
                  type="checkbox"
                  checked={speechEnabled}
                  onChange={(e) => setSpeechEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                自動朗讀
              </label>
            </div>
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
                correctAnswer={question.answer}
                speakCorrectAnswer={speechEnabled}
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
