"use client";

import { useCallback, useMemo, useState } from "react";

interface Card {
  a: number;
  b: number;
  answer: number;
}

function buildCards(): Card[] {
  const cards: Card[] = [];
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      cards.push({ a, b, answer: a * b });
    }
  }
  return cards;
}

function shuffle(cards: Card[]): Card[] {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function Flashcard() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [randomMode, setRandomMode] = useState(false);
  const baseCards = useMemo(() => buildCards(), []);
  const cards = useMemo(
    () => (randomMode ? shuffle(baseCards) : baseCards),
    [baseCards, randomMode]
  );
  const card = cards[index];

  const flip = useCallback(() => setFlipped((f) => !f), []);
  const prev = useCallback(() => {
    setIndex((i) => (i <= 0 ? cards.length - 1 : i - 1));
    setFlipped(false);
  }, [cards.length]);
  const next = useCallback(() => {
    setIndex((i) => (i >= cards.length - 1 ? 0 : i + 1));
    setFlipped(false);
  }, [cards.length]);
  const toggleRandom = useCallback(() => {
    setRandomMode((v) => !v);
    setIndex(0);
    setFlipped(false);
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 sm:max-w-lg">
      <div className="flex w-full max-w-[320px] items-center justify-between">
        <p className="text-sm font-semibold text-gray-600">
          {index + 1} / {cards.length}
        </p>
        <button
          type="button"
          onClick={toggleRandom}
          className={`min-h-[36px] rounded-full px-4 text-xs font-bold shadow-sm transition ${
            randomMode
              ? "bg-emerald-200 text-emerald-900"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {randomMode ? "隨機模式：開" : "隨機模式：關"}
        </button>
      </div>
      <button
        type="button"
        onClick={flip}
        className="flex min-h-[200px] w-full max-w-[280px] flex-col items-center justify-center rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 shadow-lg transition active:scale-[0.98] touch-manipulation sm:min-h-[240px] sm:max-w-[320px] sm:p-8"
        aria-label={flipped ? "看題目" : "看答案"}
      >
        {flipped ? (
          <span className="text-4xl font-bold text-[var(--primary)] sm:text-5xl md:text-6xl">
            {card.answer}
          </span>
        ) : (
          <span className="text-3xl font-bold text-[var(--foreground)] sm:text-4xl md:text-5xl">
            {card.a} × {card.b} = ?
          </span>
        )}
      </button>
      <div className="flex w-full max-w-[280px] justify-between sm:max-w-[320px]">
        <button
          type="button"
          onClick={prev}
          className="min-h-[48px] rounded-xl bg-gray-200 px-6 font-bold text-gray-800 hover:bg-gray-300 active:scale-[0.98] touch-manipulation"
        >
          ← 上一張
        </button>
        <button
          type="button"
          onClick={next}
          className="min-h-[48px] rounded-xl bg-amber-400 px-6 font-bold text-amber-950 hover:bg-amber-500 active:scale-[0.98] touch-manipulation"
        >
          下一張 →
        </button>
      </div>
    </div>
  );
}
