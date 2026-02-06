const CORRECT_PATH = "/sounds/correct.wav";
const WRONG_PATH = "/sounds/wrong.wav";
const CELEBRATION_PATH = "/sounds/celebration.mp3";
const WATER_DRIP_PATH = "/sounds/water_drip.mp3";
const SPRAY_PATH = "/sounds/spray.mp3";
const SOIL_SCRAPE_PATH = "/sounds/Scraping and Sliding On Forest Soil.mp3";
const SPARKLE_PATH = "/sounds/sparkle.mp3";
const SCISSOR_SNIP_PATH = "/sounds/Snip with scissor.mp3";

let correctAudio: HTMLAudioElement | null = null;
let wrongAudio: HTMLAudioElement | null = null;
let celebrationAudio: HTMLAudioElement | null = null;
let waterAudio: HTMLAudioElement | null = null;
let sprayAudio: HTMLAudioElement | null = null;
let soilAudio: HTMLAudioElement | null = null;
let sparkleAudio: HTMLAudioElement | null = null;
let purchaseAudio: HTMLAudioElement | null = null;
let scissorAudio: HTMLAudioElement | null = null;

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

export function playCelebrationSound(): void {
  if (typeof window === "undefined") return;
  const audio = celebrationAudio ?? new Audio(CELEBRATION_PATH);
  celebrationAudio = audio;
  audio.volume = 0.7;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

export async function playWaterSound(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const audio = waterAudio ?? new Audio(WATER_DRIP_PATH);
  waterAudio = audio;
  audio.volume = 0.6;
  audio.currentTime = 0;
  audio.play().catch(() => {});
  if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration * 1000;
  return new Promise((resolve) => {
    let settled = false;
    const done = (ms: number) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("loadedmetadata", onMeta);
      resolve(ms);
    };
    const onMeta = () => {
      const ms = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
      done(ms);
    };
    audio.addEventListener("loadedmetadata", onMeta, { once: true });
    setTimeout(() => done(0), 300);
  });
}

export async function playSpraySound(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const audio = sprayAudio ?? new Audio(SPRAY_PATH);
  sprayAudio = audio;
  audio.volume = 0.6;
  audio.currentTime = 0;
  audio.play().catch(() => {});

  const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
  if (durationMs > 0) return durationMs;

  return new Promise((resolve) => {
    let settled = false;
    const done = (ms: number) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("loadedmetadata", onMeta);
      resolve(ms);
    };
    const onMeta = () => {
      const ms = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
      done(ms);
    };
    audio.addEventListener("loadedmetadata", onMeta, { once: true });
    setTimeout(() => done(0), 300);
  });
}

export async function playSoilSound(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const audio = soilAudio ?? new Audio(SOIL_SCRAPE_PATH);
  soilAudio = audio;
  audio.volume = 0.65;
  audio.currentTime = 0;
  audio.play().catch(() => {});
  if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration * 1000;
  return new Promise((resolve) => {
    let settled = false;
    const done = (ms: number) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("loadedmetadata", onMeta);
      resolve(ms);
    };
    const onMeta = () => {
      const ms = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
      done(ms);
    };
    audio.addEventListener("loadedmetadata", onMeta, { once: true });
    setTimeout(() => done(0), 300);
  });
}

export async function playSparkleSound(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const audio = sparkleAudio ?? new Audio(SPARKLE_PATH);
  sparkleAudio = audio;
  audio.volume = 0.6;
  audio.currentTime = 0;
  audio.play().catch(() => {});
  if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration * 1000;
  return new Promise((resolve) => {
    let settled = false;
    const done = (ms: number) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("loadedmetadata", onMeta);
      resolve(ms);
    };
    const onMeta = () => {
      const ms = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
      done(ms);
    };
    audio.addEventListener("loadedmetadata", onMeta, { once: true });
    setTimeout(() => done(0), 300);
  });
}

export async function playPurchaseSound(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const audio = purchaseAudio ?? new Audio(SPARKLE_PATH);
  purchaseAudio = audio;
  audio.volume = 0.6;
  audio.currentTime = 0;
  audio.play().catch(() => {});
  if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration * 1000;
  return new Promise((resolve) => {
    let settled = false;
    const done = (ms: number) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("loadedmetadata", onMeta);
      resolve(ms);
    };
    const onMeta = () => {
      const ms = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
      done(ms);
    };
    audio.addEventListener("loadedmetadata", onMeta, { once: true });
    setTimeout(() => done(0), 300);
  });
}

export async function playScissorSound(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const audio = scissorAudio ?? new Audio(SCISSOR_SNIP_PATH);
  scissorAudio = audio;
  audio.volume = 0.6;
  audio.currentTime = 0;
  audio.play().catch(() => {});
  if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration * 1000;
  return new Promise((resolve) => {
    let settled = false;
    const done = (ms: number) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("loadedmetadata", onMeta);
      resolve(ms);
    };
    const onMeta = () => {
      const ms = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
      done(ms);
    };
    audio.addEventListener("loadedmetadata", onMeta, { once: true });
    setTimeout(() => done(0), 300);
  });
}
