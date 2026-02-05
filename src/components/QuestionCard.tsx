"use client";

import type { Question } from "@/src/generator";

const OP_SYMBOL: Record<string, string> = {
  add: "+",
  sub: "−",
  mul: "×",
  div: "÷",
};

export interface QuestionCardProps {
  question: Question;
  answerInput?: string;
}

export function QuestionCard({ question, answerInput = "" }: QuestionCardProps) {
  const symbol = OP_SYMBOL[question.op] ?? "?";
  return (
    <div className="flex flex-col items-center gap-3 text-center sm:gap-4 md:gap-5">
      <p className="text-3xl font-bold text-[var(--foreground)] sm:text-4xl md:text-5xl lg:text-6xl">
        {question.a} {symbol} {question.b} =
      </p>
      <p className="min-h-[2.5rem] text-2xl font-bold text-[var(--primary)] sm:min-h-[3rem] sm:text-3xl md:text-4xl lg:text-5xl">
        {answerInput || "?"}
      </p>
    </div>
  );
}
