"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { generateQuestion } from "@/src/generator";
import type { Question } from "@/src/generator/types";
import { addCoins } from "@/src/persistence/wallet";
import { playBlockLandSound } from "@/src/lib/sound";

const OP_SYMBOL: Record<Question["op"], string> = {
  add: "+",
  sub: "−",
  mul: "×",
  div: "÷",
};

function formatQuestionText(q: Question): string {
  return `${q.a}${OP_SYMBOL[q.op]}${q.b}=?`;
}

/** 落地區底邊 y（方塊底邊 >= 此值即視為落地）；調大 = 遊戲畫面更長 */
const GROUND_Y = 420;
/** 方塊高度（px） */
const BLOCK_HEIGHT = 56;
/** 每 frame 下落像素（約 60fps）；調小 = 落地速度較慢 */
const FALL_SPEED = 0.5;
/** 連對幾題給加分 */
const STREAK_BONUS_THRESHOLD = 4;
/** 連對加分 */
const STREAK_BONUS_POINTS = 1;
/** 堆疊上限：超過即 Game Over */
const MAX_PILE = Math.ceil(GROUND_Y / BLOCK_HEIGHT);
/** 遊戲結束時代幣換算：每 SCORE_PER_COIN 分換 1 代幣，上限 COIN_CAP（調高讓高分能拿到更多代幣） */
const SCORE_PER_COIN = 10;
const COIN_CAP = 25;
/** 連對 5、10、15…題時加倍：每 5 題倍率 ×2（5→2x, 10→4x, 15→8x） */
const STREAK_DOUBLE_EVERY = 5;

const DEFAULT_OPTIONS = {
  operation: "mixed" as const,
  rangeMin: 1,
  rangeMax: 30,
  difficulty: "normal" as const,
};

/** 方塊顏色（像俄羅斯方塊一樣每塊不同） */
const BLOCK_COLORS = [
  { bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-900" },
  { bg: "bg-emerald-50", border: "border-emerald-400", text: "text-emerald-900" },
  { bg: "bg-sky-50", border: "border-sky-400", text: "text-sky-900" },
  { bg: "bg-violet-50", border: "border-violet-400", text: "text-violet-900" },
  { bg: "bg-rose-50", border: "border-rose-400", text: "text-rose-900" },
  { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-900" },
  { bg: "bg-teal-50", border: "border-teal-400", text: "text-teal-900" },
  { bg: "bg-fuchsia-50", border: "border-fuchsia-400", text: "text-fuchsia-900" },
] as const;

function pickRandomColorIndex(): number {
  return Math.floor(Math.random() * BLOCK_COLORS.length);
}

type PileBlock = { question: Question; colorIndex: number };
type CurrentBlock = { question: Question; blockY: number; colorIndex: number };

export default function BlockPage() {
  const [currentBlock, setCurrentBlock] = useState<CurrentBlock | null>(null);
  const [pile, setPile] = useState<PileBlock[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [coinsEarnedThisGame, setCoinsEarnedThisGame] = useState(0);
  const [maxStreakThisGame, setMaxStreakThisGame] = useState(0);
  const awardedRef = useRef(false);
  const answeredRef = useRef(false);
  const rafRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const pileTopY = GROUND_Y - pile.length * BLOCK_HEIGHT;

  const spawnNext = useCallback(() => {
    if (pile.length >= MAX_PILE) {
      setGameOver(true);
      return;
    }
    const question = generateQuestion(DEFAULT_OPTIONS);
    const colorIndex = pickRandomColorIndex();
    setCurrentBlock({ question, blockY: 0, colorIndex });
    setInputValue("");
    answeredRef.current = false;
    inputRef.current?.focus();
  }, [pile.length]);

  useEffect(() => {
    if (!gameOver && currentBlock === null && pile.length < MAX_PILE) spawnNext();
  }, [gameOver, currentBlock, pile.length, spawnNext]);

  /** 遊戲結束時依總分一次結算代幣（只發一次）；連對 3、6、9…題則依序加倍 */
  useEffect(() => {
    if (!gameOver || awardedRef.current) return;
    awardedRef.current = true;
    const baseCoins = Math.floor(score / SCORE_PER_COIN);
    const streakMultiplier = 2 ** Math.floor(maxStreakThisGame / STREAK_DOUBLE_EVERY);
    const coins = Math.min(COIN_CAP, baseCoins * streakMultiplier);
    if (coins > 0) {
      addCoins(coins).then(() => setCoinsEarnedThisGame(coins));
    }
  }, [gameOver, score, maxStreakThisGame]);

  useEffect(() => {
    if (!currentBlock || isPaused || gameOver) return;
    const tick = () => {
      setCurrentBlock((prev) => {
        if (!prev) return null;
        const nextY = prev.blockY + FALL_SPEED;
        if (nextY + BLOCK_HEIGHT >= pileTopY && !answeredRef.current) {
          answeredRef.current = true;
          setStreak(0);
          playBlockLandSound();
          setMessage("沒答到～堆疊了");
          setTimeout(() => setMessage(null), 400);
          setPile((p) => {
            const next = [...p, { question: prev.question, colorIndex: prev.colorIndex }];
            if (next.length >= MAX_PILE) setTimeout(() => setGameOver(true), 0);
            return next;
          });
          return null;
        }
        return { ...prev, blockY: nextY };
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentBlock, isPaused, gameOver, pileTopY, spawnNext]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentBlock) return;
      const num = parseInt(inputValue.trim(), 10);
      if (Number.isNaN(num)) {
        setMessage("請輸入數字");
        return;
      }
      if (answeredRef.current) return;
      answeredRef.current = true;
      if (num === currentBlock.question.answer) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setMaxStreakThisGame((m) => Math.max(m, newStreak));
        const base = 1;
        const bonus = newStreak >= STREAK_BONUS_THRESHOLD ? STREAK_BONUS_POINTS : 0;
        setScore((s) => s + base + bonus);
        setMessage(bonus > 0 ? `答對！+${base + bonus} 分（連對加分）` : "答對！");
        setCurrentBlock(null);
      } else {
        setStreak(0);
        playBlockLandSound();
        setMessage("答錯了～堆疊了");
        setPile((p) => {
          const next = [...p, { question: currentBlock.question, colorIndex: currentBlock.colorIndex }];
          if (next.length >= MAX_PILE) setTimeout(() => setGameOver(true), 0);
          return next;
        });
        setCurrentBlock(null);
      }
      setInputValue("");
      setTimeout(() => setMessage(null), 400);
    },
    [currentBlock, inputValue, streak, spawnNext]
  );

  const handleRestart = useCallback(() => {
    setPile([]);
    setCurrentBlock(null);
    setScore(0);
    setStreak(0);
    setMaxStreakThisGame(0);
    setMessage(null);
    setGameOver(false);
    setCoinsEarnedThisGame(0);
    awardedRef.current = false;
    answeredRef.current = false;
  }, []);

  if (gameOver) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--background)] px-4 py-6">
        <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-8">
          <h1 className="text-center text-2xl font-bold text-amber-900">堆滿了！遊戲結束</h1>
          <p className="text-2xl font-bold text-amber-800">得分：{score}</p>
          {coinsEarnedThisGame > 0 && (
            <>
              <p className="text-center text-lg font-semibold text-amber-700">
                本場獲得 {coinsEarnedThisGame} 代幣
              </p>
              {maxStreakThisGame >= STREAK_DOUBLE_EVERY && (
                <p className="text-center text-sm text-amber-600">
                  連對 {maxStreakThisGame} 題，代幣 {2 ** Math.floor(maxStreakThisGame / STREAK_DOUBLE_EVERY)} 倍！
                </p>
              )}
            </>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRestart}
              className="min-h-[48px] rounded-xl bg-[var(--primary)] px-6 font-bold text-white hover:bg-[var(--primary-hover)]"
            >
              再玩一次
            </button>
            <Link
              href="/"
              className="flex min-h-[48px] items-center rounded-xl border-2 border-gray-300 px-6 font-semibold text-gray-700 hover:bg-gray-50"
            >
              返回首頁
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-[var(--background)] px-4 py-6">
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-semibold text-[var(--primary)] hover:underline">
            ← 返回
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-amber-100 px-3 py-1 font-bold text-amber-800">
              分數：{score}
            </span>
            <span className="text-xs text-gray-500">堆疊 {pile.length}/{MAX_PILE}</span>
            {streak >= 2 && (
              <span className="rounded-lg bg-green-100 px-2 py-1 text-sm font-semibold text-green-800">
                連對 {streak}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {isPaused ? "繼續" : "暫停"}
            </button>
          </div>
        </div>
        <h1 className="text-center text-xl font-bold text-[var(--foreground)] sm:text-2xl">
          📦 方塊算術
        </h1>
        <p className="text-center text-sm text-gray-600">
          答對方塊消失得分；答錯或落地會堆疊，堆滿就結束
        </p>

        {/* 遊戲區：堆疊方塊 + 落下方塊 + 地面 */}
        <div
          className="relative mx-auto w-full overflow-hidden rounded-2xl border-2 border-gray-300 bg-sky-50/80"
          style={{ height: GROUND_Y + 24 }}
        >
          {/* 已堆疊的方塊（從下往上） */}
          {pile.map((item, index) => {
            const topY = GROUND_Y - (index + 1) * BLOCK_HEIGHT;
            const style = BLOCK_COLORS[item.colorIndex % BLOCK_COLORS.length];
            return (
              <div
                key={index}
                className={`absolute left-1/2 flex h-14 w-32 -translate-x-1/2 items-center justify-center rounded-xl border-2 shadow-md ${style.bg} ${style.border}`}
                style={{ top: topY, minHeight: BLOCK_HEIGHT }}
              >
                <span className={`text-xl font-bold tabular-nums sm:text-2xl ${style.text}`}>
                  {formatQuestionText(item.question)}
                </span>
              </div>
            );
          })}
          {/* 正在落下的方塊 */}
          {currentBlock && (() => {
            const style = BLOCK_COLORS[currentBlock.colorIndex % BLOCK_COLORS.length];
            return (
              <div
                className={`absolute left-1/2 flex h-14 w-32 -translate-x-1/2 items-center justify-center rounded-xl border-2 shadow-lg ${style.bg} ${style.border}`}
                style={{
                  top: currentBlock.blockY,
                  minHeight: BLOCK_HEIGHT,
                }}
              >
                <span className={`text-xl font-bold tabular-nums sm:text-2xl ${style.text}`}>
                  {formatQuestionText(currentBlock.question)}
                </span>
              </div>
            );
          })()}
          {/* 地面線 */}
          <div
            className="absolute left-0 right-0 border-t-4 border-amber-700"
            style={{ top: GROUND_Y }}
          />
          <div
            className="absolute left-0 right-0 bg-amber-800/20"
            style={{ top: GROUND_Y, height: 24 }}
          />
        </div>

        {message && (
          <p className="text-center font-semibold text-amber-800" role="status">
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="block-answer" className="text-sm font-medium text-gray-700">
            輸入答案
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="block-answer"
              type="number"
              inputMode="numeric"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isPaused || !currentBlock}
              className="min-h-[48px] flex-1 rounded-xl border-2 border-gray-300 bg-white px-4 text-lg font-bold tabular-nums focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-60"
              placeholder="?"
              autoFocus
            />
            <button
              type="submit"
              disabled={isPaused || !currentBlock}
              className="min-h-[48px] rounded-xl bg-[var(--primary)] px-6 font-bold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              送出
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
