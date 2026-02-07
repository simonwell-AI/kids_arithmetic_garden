"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DrillSettings, type DrillSettingsState } from "@/src/components/DrillSettings";
import { MixedSpeedQuiz } from "@/src/components/MixedSpeedQuiz";
import { QuestionCard } from "@/src/components/QuestionCard";
import { NumericKeypad } from "@/src/components/NumericKeypad";
import { FeedbackToast } from "@/src/components/FeedbackToast";
import { DrillEndScreen } from "@/src/components/DrillEndScreen";
import { generateQuestions, generateQuestionFromSkillKey } from "@/src/generator";
import type { Question } from "@/src/generator";
import { sampleQuestions, updateWeight } from "@/src/adaptive";
import {
  getAllWeights,
  saveWeights,
  saveSession,
  updateSessionEnd,
  saveAttempt,
  createSessionId,
  createAttemptId,
  awardCompletionReward,
} from "@/src/persistence";
import { playFeedbackSound } from "@/src/lib/sound";
import { speakText, stopSpeaking } from "@/src/lib/speech";
import type { AttemptRecord } from "@/src/persistence/db";

type Phase = "menu" | "settings" | "questions" | "end" | "mixedSpeed";

export default function DrillPage() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [settings, setSettings] = useState<DrillSettingsState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastTimeMs, setLastTimeMs] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [weightsMap, setWeightsMap] = useState<Record<string, number>>({});
  const [rewardCoins, setRewardCoins] = useState<number | null>(null);

  const question = questions[index];
  const speakEnabled = settings?.speech ?? false;

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

  useEffect(() => {
    if (phase !== "questions" || !question || !speakEnabled) return;
    stopSpeaking();
    speakText(questionSpeechText);
  }, [phase, question, speakEnabled, questionSpeechText]);

  const handleStartDrill = useCallback(async (s: DrillSettingsState) => {
    setSettings(s);
    let qs: Question[];
    if (s.adaptive) {
      const weights = await getAllWeights();
      setWeightsMap(weights);
      const count = s.count ?? 20;
      qs = sampleQuestions(weights, count, {
        operation: s.operation,
        rangeMin: s.rangeMin,
        rangeMax: s.rangeMax,
        difficulty: s.difficulty,
      });
    } else {
      qs = generateQuestions({
        operation: s.operation,
        rangeMin: s.rangeMin,
        rangeMax: s.rangeMax,
        count: s.count ?? 20,
        difficulty: s.difficulty,
      });
    }
    setQuestions(qs);
    const sid = createSessionId();
    setSessionId(sid);
    await saveSession({
      id: sid,
      mode: "drill",
      startedAt: Date.now(),
      settings: s as unknown as Record<string, unknown>,
    });
    setIndex(0);
    setValue("");
    setCorrectCount(0);
    setTotalTimeMs(0);
    setAttempts([]);
    setStartedAt(Date.now());
    setPhase("questions");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!question || phase !== "questions" || !sessionId) return;
    const num = parseInt(value, 10);
    const correct = num === question.answer;
    const elapsed = Date.now() - startedAt;
    playFeedbackSound(correct);
    setLastCorrect(correct);
    setLastTimeMs(elapsed);
    setShowFeedback(true);

    const w = await getAllWeights();
    updateWeight(w, question.skillKey, correct, elapsed);
    await saveWeights(w);
    setWeightsMap(w);

    const attemptId = createAttemptId();
    await saveAttempt({
      id: attemptId,
      sessionId,
      question: {
        a: question.a,
        b: question.b,
        op: question.op,
        answer: question.answer,
        skillKey: question.skillKey,
      },
      correct,
      responseTimeMs: elapsed,
      skillKey: question.skillKey,
      createdAt: Date.now(),
    });
    setAttempts((prev) => [
      ...prev,
      {
        id: attemptId,
        sessionId,
        question: {
          a: question.a,
          b: question.b,
          op: question.op,
          answer: question.answer,
          skillKey: question.skillKey,
        },
        correct,
        responseTimeMs: elapsed,
        skillKey: question.skillKey,
        createdAt: Date.now(),
      },
    ]);

    if (correct) {
      setCorrectCount((c) => c + 1);
      setTotalTimeMs((t) => t + elapsed);
    }
  }, [question, value, phase, sessionId, startedAt]);

  const handleDismissFeedback = useCallback(async () => {
    setShowFeedback(false);
    setValue("");
    if (index >= questions.length - 1) {
      if (sessionId) updateSessionEnd(sessionId, Date.now());
      const totalCount = questions.length;
      const result = await awardCompletionReward(correctCount, totalCount);
      setRewardCoins(result.awarded ? result.amount : 0);
      setPhase("end");
      return;
    }
    setIndex((i) => i + 1);
    setStartedAt(Date.now());
  }, [index, questions.length, sessionId, correctCount]);

  const handleRetryWrong = useCallback(() => {
    const wrongAttempts = attempts.filter((a) => !a.correct);
    if (wrongAttempts.length === 0) {
      setPhase("settings");
      setSettings(null);
      setQuestions([]);
      setRewardCoins(null);
      return;
    }
    const qs: Question[] = wrongAttempts.map((a) => {
      const q = generateQuestionFromSkillKey(a.skillKey, {
        rangeMin: settings?.rangeMin ?? 0,
        rangeMax: settings?.rangeMax ?? 20,
      });
      return q ?? { a: a.question.a, b: a.question.b, op: a.question.op as Question["op"], answer: a.question.answer, skillKey: a.skillKey };
    });
    setQuestions(qs);
    const sid = createSessionId();
    setSessionId(sid);
    saveSession({
      id: sid,
      mode: "drill",
      startedAt: Date.now(),
      settings: { retryWrong: true },
    });
    setIndex(0);
    setValue("");
    setCorrectCount(0);
    setTotalTimeMs(0);
    setAttempts([]);
    setStartedAt(Date.now());
    setPhase("questions");
  }, [attempts, settings]);

  const totalCount = questions.length;
  const avgTimeMs = totalCount > 0 ? Math.round(totalTimeMs / totalCount) : 0;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex w-full max-w-lg flex-col items-center gap-6">
        <Link
          href="/"
          className="self-start font-semibold text-[var(--primary)] hover:underline"
        >
          ← 返回首頁
        </Link>
        {phase === "menu" && (
          <div className="flex w-full max-w-md flex-col gap-4 sm:max-w-lg">
            <h2 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">
              練習題
            </h2>
            <p className="text-gray-600">選一個模式</p>
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setPhase("settings")}
                className="min-h-[56px] rounded-2xl bg-[var(--primary)] px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-[var(--primary-hover)] active:scale-[0.98] touch-manipulation"
              >
                自訂練習（題數與運算類型）
              </button>
              <button
                type="button"
                onClick={() => setPhase("mixedSpeed")}
                className="min-h-[56px] rounded-2xl bg-amber-400 px-6 py-4 text-lg font-bold text-amber-950 shadow transition hover:bg-amber-500 active:scale-[0.98] touch-manipulation"
              >
                綜合題速度測驗（60 秒）
              </button>
            </div>
          </div>
        )}
        {phase === "settings" && (
          <>
            <button
              type="button"
              onClick={() => setPhase("menu")}
              className="self-start text-sm font-medium text-gray-600 hover:underline"
            >
              ← 返回選擇
            </button>
            <DrillSettings onSubmit={handleStartDrill} />
          </>
        )}
        {phase === "mixedSpeed" && (
          <>
            <button
              type="button"
              onClick={() => setPhase("menu")}
              className="self-start text-sm font-medium text-gray-600 hover:underline"
            >
              ← 返回選擇
            </button>
            <MixedSpeedQuiz onBack={() => setPhase("menu")} />
          </>
        )}
        {phase === "questions" && question && (
          <>
            <p className="text-sm font-semibold text-gray-600">
              {index + 1} / {questions.length}
            </p>
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
          </>
        )}
        {phase === "end" && (
          <DrillEndScreen
            correctCount={correctCount}
            totalCount={totalCount}
            avgTimeMs={avgTimeMs}
            rewardCoins={rewardCoins ?? undefined}
            onRetryWrong={handleRetryWrong}
            onNewDrill={() => {
              setPhase("menu");
              setSettings(null);
              setQuestions([]);
              setRewardCoins(null);
            }}
            onGoHome={() => window.location.assign("/")}
          />
        )}
      </div>
    </div>
  );
}
