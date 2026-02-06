"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DrillSettings, type DrillSettingsState } from "@/src/components/DrillSettings";
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
} from "@/src/persistence";
import { advanceDailyProgressAndClaimReward } from "@/src/persistence/dailyReward";
import { playFeedbackSound } from "@/src/lib/sound";
import { speakText, stopSpeaking } from "@/src/lib/speech";
import type { AttemptRecord } from "@/src/persistence/db";

type Phase = "settings" | "questions" | "end";

export default function DrillPage() {
  const [phase, setPhase] = useState<Phase>("settings");
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
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);

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

    const rewardResult = await advanceDailyProgressAndClaimReward();
    const reward = rewardResult.reward;
    if (reward?.claimed && reward.rewardAmount > 0) {
      const msg =
        reward.streakBonus > 0
          ? `今日任務完成！獲得 ${reward.rewardAmount} 代幣！（含連續 7 天獎勵 +${reward.streakBonus}）`
          : `今日任務完成！獲得 ${reward.rewardAmount} 代幣！`;
      setRewardMessage(msg);
      setTimeout(() => setRewardMessage(null), 4000);
    }

    if (correct) {
      setCorrectCount((c) => c + 1);
      setTotalTimeMs((t) => t + elapsed);
    }
  }, [question, value, phase, sessionId, startedAt]);

  const handleDismissFeedback = useCallback(() => {
    setShowFeedback(false);
    setValue("");
    if (index >= questions.length - 1) {
      if (sessionId) updateSessionEnd(sessionId, Date.now());
      setPhase("end");
      return;
    }
    setIndex((i) => i + 1);
    setStartedAt(Date.now());
  }, [index, questions.length, sessionId]);

  const handleRetryWrong = useCallback(() => {
    const wrongAttempts = attempts.filter((a) => !a.correct);
    if (wrongAttempts.length === 0) {
      setPhase("settings");
      setSettings(null);
      setQuestions([]);
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
        {phase === "settings" && <DrillSettings onSubmit={handleStartDrill} />}
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
        {phase === "end" && (
          <DrillEndScreen
            correctCount={correctCount}
            totalCount={totalCount}
            avgTimeMs={avgTimeMs}
            onRetryWrong={handleRetryWrong}
            onNewDrill={() => {
              setPhase("settings");
              setSettings(null);
              setQuestions([]);
            }}
            onGoHome={() => window.location.assign("/")}
          />
        )}
      </div>
    </div>
  );
}
