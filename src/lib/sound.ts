const CORRECT_PATH = "/sounds/correct.wav";
const WRONG_PATH = "/sounds/wrong.wav";

let correctAudio: HTMLAudioElement | null = null;
let wrongAudio: HTMLAudioElement | null = null;

export function playFeedbackSound(correct: boolean): void {
  if (typeof window === "undefined") return;
  const path = correct ? CORRECT_PATH : WRONG_PATH;
  const cached = correct ? correctAudio : wrongAudio;
  const audio = cached ?? new Audio(path);
  if (correct) correctAudio = audio;
  else wrongAudio = audio;
  audio.volume = 0.6;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
