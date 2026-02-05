"use client";

import { useCallback } from "react";

const DIGITS = [7, 8, 9, 4, 5, 6, 1, 2, 3, 0];

const btnBase =
  "flex min-h-[52px] min-w-[52px] items-center justify-center rounded-xl text-xl font-bold shadow transition-all active:scale-95 select-none touch-manipulation sm:min-h-[56px] sm:min-w-[56px] md:min-h-[60px] md:min-w-[60px] md:text-2xl";

export interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function NumericKeypad({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: NumericKeypadProps) {
  const handleDigit = useCallback(
    (d: number) => {
      if (disabled) return;
      onChange(value + String(d));
    },
    [value, onChange, disabled]
  );

  const handleClear = useCallback(() => {
    if (disabled) return;
    onChange("");
  }, [onChange, disabled]);

  const handleSubmit = useCallback(() => {
    if (disabled) return;
    onSubmit();
  }, [onSubmit, disabled]);

  return (
    <div className="grid w-full max-w-[280px] grid-cols-3 gap-2 sm:max-w-[320px] sm:gap-3 md:max-w-[360px] md:gap-4">
      {DIGITS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => handleDigit(d)}
          disabled={disabled}
          className={`${btnBase} bg-white text-[var(--foreground)] border-2 border-gray-200 hover:border-[var(--primary)] hover:bg-gray-50 disabled:opacity-50`}
        >
          {d}
        </button>
      ))}
      <button
        type="button"
        onClick={handleClear}
        disabled={disabled}
        className={`${btnBase} bg-gray-200 text-gray-800 hover:bg-gray-300 col-span-2`}
      >
        清除
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled}
        className={`${btnBase} bg-[var(--success)] text-white hover:opacity-90`}
      >
        ✓ 送出
      </button>
    </div>
  );
}
