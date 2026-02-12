import { openDB } from "idb";

const DB_NAME = "kid-arithmetic-db";
const DB_VERSION = 4;

export const STORE_SESSIONS = "sessions";
export const STORE_ATTEMPTS = "attempts";
export const STORE_SKILL_WEIGHTS = "skillWeights";
export const STORE_DAILY_PROGRESS = "dailyProgress";
export const STORE_WALLET = "wallet";
export const STORE_INVENTORY = "inventory";
export const STORE_GARDEN = "garden";
export const STORE_ACHIEVEMENTS = "achievements";

export const WALLET_KEY = "default";
export const INVENTORY_KEY = "default";
export const GARDEN_KEY = "default";
export const ACHIEVEMENTS_KEY = "default";

export interface SessionRecord {
  id: string;
  mode: string;
  startedAt: number;
  endedAt?: number;
  settings?: Record<string, unknown>;
}

export interface AttemptRecord {
  id: string;
  sessionId: string;
  question: { a: number; b: number; op: string; answer: number; skillKey: string };
  correct: boolean;
  responseTimeMs: number;
  skillKey: string;
  createdAt: number;
}

export interface SkillWeightRecord {
  skillKey: string;
  weight: number;
}

export interface DailyProgressRecord {
  date: string;
  questionsCompleted: number;
  /** 答對題數（用於今日任務 70% 門檻與連續天數） */
  correctCount?: number;
  completedAt?: number;
}

export interface WalletRecord {
  id: string;
  coins: number;
  lastRewardDate?: string;
}

export interface InventoryRecord {
  id: string;
  water: number;
  fertilizerBasic: number;
  fertilizerPremium: number;
  /** 殺蟲劑（消耗品，花園除蟲用） */
  insecticide?: number;
  seeds: Record<string, number>;
  tools?: Record<string, number>;
  wateringCans?: Record<string, number>;
  backpacks?: Record<string, number>;
  selectedBackpackId?: string;
  capacity?: number;
}

export interface GardenRecord {
  id: string;
  seedId: string;
  plantedAt: number;
  /** 累積成長值（小數），用於計算 stage = min(4, floor(growthValue)) */
  growthValue: number;
  lastWateredAt?: number;
  lastFertilizedAt?: number;
  fertilizerType?: "basic" | "premium";
  lastForkedAt?: number;
  soilBoostUntil?: number;
  lastMistedAt?: number;
  mistBoostUntil?: number;
  soilQualityBoost?: number;
  trowelUsed?: boolean;
  /** 上次修剪雜草時間（用於 3 小時冷卻） */
  lastTrimmedAt?: number;
  /** 是否有蟲害（降低成長速率） */
  hasBugs?: boolean;
  /** 上次徒手抓蟲時間（用於冷卻） */
  lastBugsRemovedAt?: number;
}

export interface AchievementRecord {
  id: string;
  /** 第一次開花（收成開花株） */
  firstBloomUnlocked: boolean;
  firstBloomUnlockedAt?: number;
  /** 連續 7 天進花園 */
  gardenStreak7Unlocked: boolean;
  gardenStreak7UnlockedAt?: number;
  lastGardenVisitDate: string;
  gardenConsecutiveDays: number;
  /** 除蟲次數累計 */
  bugsRemovedCount: number;
  /** 除蟲 5 次 */
  bugsRemoved5Unlocked: boolean;
  bugsRemoved5UnlockedAt?: number;
  /** 剪雜草次數累計 */
  weedsTrimmedCount: number;
  /** 剪雜草 3 次 */
  weedsTrimmed3Unlocked: boolean;
  weedsTrimmed3UnlockedAt?: number;
  /** 曾種過的種子 ID 列表（商店不再販賣） */
  plantedSeedIds?: string[];
}

let dbPromise: ReturnType<typeof openDB> | null = null;

export function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        if (oldVersion < 1) {
          db.createObjectStore(STORE_SESSIONS, { keyPath: "id" });
          const attemptsStore = db.createObjectStore(STORE_ATTEMPTS, { keyPath: "id" });
          attemptsStore.createIndex("by-sessionId", "sessionId");
          db.createObjectStore(STORE_SKILL_WEIGHTS, { keyPath: "skillKey" });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(STORE_DAILY_PROGRESS)) {
            db.createObjectStore(STORE_DAILY_PROGRESS, { keyPath: "date" });
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains(STORE_WALLET)) {
            db.createObjectStore(STORE_WALLET, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(STORE_INVENTORY)) {
            db.createObjectStore(STORE_INVENTORY, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(STORE_GARDEN)) {
            db.createObjectStore(STORE_GARDEN, { keyPath: "id" });
          }
        }
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains(STORE_ACHIEVEMENTS)) {
            db.createObjectStore(STORE_ACHIEVEMENTS, { keyPath: "id" });
          }
        }
      },
    });
  }
  return dbPromise;
}
