/**
 * Web Speech API 語音朗讀（TTS）
 * 用於九九乘法表等朗讀功能。
 */

const DEFAULT_LANG = "zh-TW";

function getSpeech(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis;
}

/**
 * 朗讀一段文字
 */
export function speakText(
  text: string,
  options?: { lang?: string; onEnd?: () => void }
): void {
  const synth = getSpeech();
  if (!synth || !text.trim()) {
    options?.onEnd?.();
    return;
  }
  const u = new SpeechSynthesisUtterance(text.trim());
  u.lang = options?.lang ?? DEFAULT_LANG;
  u.rate = 0.9;
  u.pitch = 1;
  if (options?.onEnd) u.onend = options.onEnd;
  synth.speak(u);
}

/** 朗讀整張表時由 stopSpeaking 設為 true，speakNext 會不再排下一句 */
let tableSpeakingCancelled = false;

/**
 * 停止所有朗讀
 */
export function stopSpeaking(): void {
  tableSpeakingCancelled = true;
  const synth = getSpeech();
  if (synth) synth.cancel();
}

/**
 * 是否正在朗讀
 */
export function isSpeaking(): boolean {
  const synth = getSpeech();
  return synth ? synth.speaking : false;
}

/** 2~9 乘法表朗讀用句子：依序 2×1=2 … 9×9=81 */
function buildFullTableSentences(): string[] {
  const sentences: string[] = [];
  for (let a = 2; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      const ans = a * b;
      sentences.push(`${a} 乘以 ${b} 等於 ${ans}`);
    }
  }
  return sentences;
}

/** 單一乘法表（例如 2 的乘法）：2×1 … 2×9 */
function buildTimesTableSentences(a: number): string[] {
  const sentences: string[] = [];
  for (let b = 1; b <= 9; b++) {
    sentences.push(`${a} 乘以 ${b} 等於 ${a * b}`);
  }
  return sentences;
}

export type SpeakProgressCallback = (a: number, b: number) => void;

function speakSentencesInSequence(
  sentences: string[],
  options: {
    onEnd?: () => void;
    onProgress?: SpeakProgressCallback;
    getPosition: (index: number) => { a: number; b: number };
  }
): void {
  const { onEnd, onProgress, getPosition } = options;
  const synth = getSpeech();
  if (!synth || sentences.length === 0) {
    onEnd?.();
    return;
  }
  tableSpeakingCancelled = false;
  const s: SpeechSynthesis = synth;
  s.cancel();
  let index = 0;

  function speakNext(): void {
    if (tableSpeakingCancelled || index >= sentences.length) {
      onEnd?.();
      return;
    }
    const pos = getPosition(index);
    onProgress?.(pos.a, pos.b);
    const text = sentences[index];
    index += 1;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = DEFAULT_LANG;
    u.rate = 0.9;
    u.pitch = 1;
    u.onend = () => speakNext();
    u.onerror = () => speakNext();
    s.speak(u);
  }

  speakNext();
}

/** 整張表：index 對應 (a,b)，依序 2×1…2×9, 3×1…3×9, … */
function fullTablePosition(index: number): { a: number; b: number } {
  return {
    a: 2 + Math.floor(index / 9),
    b: 1 + (index % 9),
  };
}

/**
 * 朗讀完整 2~9 九九乘法表；每句接下一句，直到結束或被 stopSpeaking 中斷。
 * onProgress(a, b)：每開始唸一句時呼叫，供 UI 高亮該格。
 */
export function speakFullMultiplicationTable(
  onEnd?: () => void,
  onProgress?: SpeakProgressCallback
): void {
  speakSentencesInSequence(buildFullTableSentences(), {
    onEnd,
    onProgress,
    getPosition: fullTablePosition,
  });
}

/**
 * 朗讀單一乘法表（例如 2 的乘法：2×1 到 2×9）。
 * onProgress(a, b)：每開始唸一句時呼叫，供 UI 高亮該格。
 */
export function speakTimesTable(
  a: number,
  onEnd?: () => void,
  onProgress?: SpeakProgressCallback
): void {
  if (a < 2 || a > 9) {
    onEnd?.();
    return;
  }
  speakSentencesInSequence(buildTimesTableSentences(a), {
    onEnd,
    onProgress,
    getPosition: (index) => ({ a, b: 1 + index }),
  });
}
