"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getGarden,
  plantSeed,
  water,
  fertilize,
  harvest,
  clearGardenWithoutHarvest,
  trimWeeds,
  loosenSoil,
  mistPlant,
  repotPlant,
  applyPottingSoil,
  removeBugsWithSpray,
  removeBeesWithSpray,
} from "@/src/persistence/garden";
import { getInventoryState } from "@/src/persistence/inventory";
import { getHasWeeds, setLastGardenVisit } from "@/src/persistence/gardenVisit";
import {
  getAchievements,
  recordGardenVisit,
  unlockFirstBloom,
  incrementBugsRemoved,
  incrementWeedsTrimmed,
  incrementHarvestCount,
  type AchievementState,
} from "@/src/persistence/achievements";
import { getSeedGrowthImagePath, SEED_NAMES } from "@/src/garden/assets";
import { SHOP_CATALOG } from "@/src/shop/catalog";
import { unlockAudio, playWaterSound, playSpraySound, playSoilSound, playSparkleSound, playScissorSound, playCelebrationSound, getScissorSoundDurationMs, getSpraySoundDurationMs, getSoilSoundDurationMs } from "@/src/lib/sound";
import { CelebrationParticles } from "@/src/components/CelebrationParticles";

type GardenAnimating = "water" | "fertilize" | "weed" | "fork" | "mist" | "soil" | "spray" | null;

const ANIMATION_DURATION_MS = 1200;
/** 澆水動畫較長：水壺傾倒 + 水流，總時長 */
const WATER_ANIMATION_DURATION_MS = 2800;
/** 肥料動畫：依購買的消耗品圖示呈現，每次至少 3 秒 */
const FERTILIZE_ANIMATION_DURATION_MS = 3200;
/** 鬆土動畫：園藝叉搖擺直到音效結束 */
const FORK_ANIMATION_MIN_MS = 800;
/** 噴霧動畫：噴霧瓶搖擺直到音效結束 */
const MIST_ANIMATION_MIN_MS = 1000;
const SOIL_ANIMATION_DURATION_MS = 1400;
/** 剪雜草動畫：依音效長度設定動畫時長，音效延遲以對齊「剪」的瞬間（約 30%） */
const WEED_ANIMATION_MIN_MS = 933;
const WEED_SNIP_SOUND_DELAY_MS = 280;
/** 鬆土冷卻時間（與 garden.ts 一致：5 分鐘） */
const FORK_COOLDOWN_MS = 5 * 60 * 1000;
/** 噴霧冷卻時間（與 garden.ts 一致：5 分鐘） */
const MIST_COOLDOWN_MS = 5 * 60 * 1000;
/** 修剪雜草冷卻時間（與 garden.ts 一致：3 小時） */
const WEED_COOLDOWN_MS = 3 * 60 * 60 * 1000;
/** 噴殺蟲劑動畫時長 */
const SPRAY_ANIMATION_DURATION_MS = 2400;
/** 商店消耗品圖示（與商店顯示一致） */
const FERTILIZER_BASIC_IMAGE = "/garden-assets/gargen_tools/normal fertilizer.png";
const FERTILIZER_PREMIUM_IMAGE = "/garden-assets/gargen_tools/Advanced_fertilizer.png";
const FERTILIZER_BOTTLE_IMAGE = "/garden-assets/gargen_tools/Fertilizer Bottle.png";
const WATER_IMAGE = "/garden-assets/gargen_tools/water.png";
const GARDEN_FORK_IMAGE = "/garden-assets/gargen_tools/Garden Fork.png";
const PLANT_MISTER_IMAGE = "/garden-assets/gargen_tools/Plant Mister.png";
const GARDEN_SCISSORS_IMAGE = "/garden-assets/gargen_tools/Garden Scissors.png";
const GARDEN_TROWEL_IMAGE = "/garden-assets/gargen_tools/Garden Trowel.png";
const POTTING_SOIL_IMAGE = "/garden-assets/gargen_tools/Potting Soil.png";
const INSECTICIDE_SPRAY_IMAGE = "/garden-assets/gargen_tools/Caterpillar_Spray.png";

const GRASS_BASE = "/garden-assets/grass";
const GRASS_IMAGES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${GRASS_BASE}/grass_${n}.png`);
/** 野草疊層：固定在同一水平面一行，沿盆底地面排列，較密集 */
const WEED_GROUND_BOTTOM = "6%";
const WEED_POSITIONS: { top?: string; bottom?: string; left?: string; right?: string; size: number }[] = [
  { bottom: WEED_GROUND_BOTTOM, left: "2%", size: 22 },
  { bottom: WEED_GROUND_BOTTOM, left: "12%", size: 24 },
  { bottom: WEED_GROUND_BOTTOM, left: "22%", size: 26 },
  { bottom: WEED_GROUND_BOTTOM, left: "32%", size: 22 },
  { bottom: WEED_GROUND_BOTTOM, left: "42%", size: 26 },
  { bottom: WEED_GROUND_BOTTOM, left: "52%", size: 24 },
  { bottom: WEED_GROUND_BOTTOM, left: "62%", size: 22 },
  { bottom: WEED_GROUND_BOTTOM, left: "72%", size: 26 },
  { bottom: WEED_GROUND_BOTTOM, left: "82%", size: 24 },
];

/** 從庫存取得第一個擁有的水壺圖片路徑（用於澆水動畫）；若無則用目錄中第一個水壺 */
function getWateringCanImagePath(wateringCans: Record<string, number> | undefined): string {
  const WATERING_CAN_BASE = "/garden-assets/watering_can";
  const defaultPath = `${WATERING_CAN_BASE}/watering-can_blue.png`;
  if (!wateringCans || Object.keys(wateringCans).length === 0) return defaultPath;
  const firstOwnedId = Object.entries(wateringCans).find(([, n]) => n > 0)?.[0];
  if (!firstOwnedId) return defaultPath;
  const item = SHOP_CATALOG.find(
    (x) => x.type === "watering_can" && x.wateringCanId === firstOwnedId
  );
  return item?.wateringCanImagePath ?? defaultPath;
}

export default function GardenPage() {
  const [garden, setGarden] = useState<Awaited<ReturnType<typeof getGarden>>>(null);
  const [inventory, setInventory] = useState<Awaited<ReturnType<typeof getInventoryState>> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [plantingSeedId, setPlantingSeedId] = useState<string | null>(null);
  const [hasWeeds, setHasWeeds] = useState(false);
  const [animating, setAnimating] = useState<GardenAnimating>(null);
  /** 施肥動畫時區分一般／高級，用於粒子顏色與樣式 */
  const [fertilizeType, setFertilizeType] = useState<"basic" | "premium" | null>(null);
  const [now, setNow] = useState(() => Date.now());
  /** 剪雜草動畫時長（依音效長度動態設定，預設 950ms） */
  const [weedAnimationDurationMs, setWeedAnimationDurationMs] = useState(950);
  /** 噴霧動畫時長（依音效長度動態設定，噴霧瓶搖擺至音效結束） */
  const [mistAnimationDurationMs, setMistAnimationDurationMs] = useState(1400);
  /** 鬆土動畫時長（依音效長度動態設定，園藝叉搖擺至音效結束） */
  const [forkAnimationDurationMs, setForkAnimationDurationMs] = useState(1200);
  /** 開花／收成慶祝粒子顯示 */
  const [showCelebration, setShowCelebration] = useState(false);
  /** 收成中：保留植物畫面做縮小淡出動畫（0.5s）後再接彩帶與音效 */
  const [harvestingGarden, setHarvestingGarden] = useState<Awaited<ReturnType<typeof getGarden>> | null>(null);
  /** 開花瞬間：光團放大淡出（0.5s）＋短音效 */
  const [showBloomFlash, setShowBloomFlash] = useState(false);
  /** 上一筆成長階段，用於偵測「剛開花」 */
  const prevStageRef = useRef<number | null>(null);
  const [achievements, setAchievements] = useState<AchievementState | null>(null);
  /** 變更植物：選單與確認視窗 */
  const [showChangePlantModal, setShowChangePlantModal] = useState(false);
  const [changePlantSelectedSeedId, setChangePlantSelectedSeedId] = useState<string | null>(null);
  const [changePlantConfirming, setChangePlantConfirming] = useState(false);
  /** 合照：開花時與植物自拍合成 */
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoCompositeBlob, setPhotoCompositeBlob] = useState<Blob | null>(null);
  const photoVideoRef = useRef<HTMLVideoElement>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const photoPreviewUrl = useMemo(
    () => (photoCompositeBlob ? URL.createObjectURL(photoCompositeBlob) : null),
    [photoCompositeBlob]
  );
  useEffect(() => () => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  }, [photoPreviewUrl]);

  const wateringCanImagePath = useMemo(
    () => getWateringCanImagePath(inventory?.wateringCans),
    [inventory?.wateringCans]
  );

  const load = useCallback(async () => {
    try {
      const visitResult = await recordGardenVisit();
      if (visitResult.justUnlocked && visitResult.coinsAwarded > 0) {
        showMessage(`成就解鎖：連續 7 天進花園！獲得 ${visitResult.coinsAwarded} 代幣`);
      }
      const [g, inv, ach] = await Promise.all([getGarden(), getInventoryState(), getAchievements()]);
      setAchievements(ach);
      const prevStage = prevStageRef.current;
      const newStage = g?.growthStage ?? null;
      prevStageRef.current = newStage;
      if (prevStage !== null && prevStage < 4 && newStage !== null && newStage >= 4) {
        unlockAudio();
        playSparkleSound();
        setShowBloomFlash(true);
      }
      setGarden(g);
      setInventory(inv);
      setHasWeeds(getHasWeeds());
    } catch {
      prevStageRef.current = null;
      setGarden(null);
      setInventory(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!garden) return;
    const t = setInterval(() => {
      const current = Date.now();
      const hasForkCooldown = garden.lastForkedAt != null && current - garden.lastForkedAt < FORK_COOLDOWN_MS;
      const hasMistCooldown = garden.lastMistedAt != null && current - garden.lastMistedAt < MIST_COOLDOWN_MS;
      const hasWeedCooldown = garden.lastTrimmedAt != null && current - garden.lastTrimmedAt < WEED_COOLDOWN_MS;
      setNow(current);
      if (!hasForkCooldown && !hasMistCooldown && !hasWeedCooldown) {
        clearInterval(t);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [garden]);

  useEffect(() => {
    return () => {
      setLastGardenVisit();
    };
  }, []);

  /** 開花光團 0.5s 後關閉 */
  useEffect(() => {
    if (!showBloomFlash) return;
    const t = setTimeout(() => setShowBloomFlash(false), 500);
    return () => clearTimeout(t);
  }, [showBloomFlash]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2500);
  };

  const formatCooldown = (ms: number) => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const handlePlant = useCallback(
    async (seedId: string) => {
      const result = await plantSeed(seedId);
      if (result.success) {
        if (result.achievementUnlock && result.achievementUnlock.coinsAwarded > 0) {
          const names: string[] = [];
          if (result.achievementUnlock.planted3JustUnlocked) names.push("小園丁");
          if (result.achievementUnlock.planted6JustUnlocked) names.push("植物收藏家");
          showMessage(`成就解鎖：${names.join("、")}！獲得 ${result.achievementUnlock.coinsAwarded} 代幣`);
        } else {
          showMessage("種植成功！");
        }
        load();
        setPlantingSeedId(null);
      } else {
        showMessage(result.message ?? "種植失敗");
      }
    },
    [load]
  );

  const handleWater = useCallback(async () => {
    unlockAudio();
    const result = await water();
    if (result.success) {
      setAnimating("water");
      const soundMs = await playWaterSound();
      showMessage("澆水成功～");
      setTimeout(() => {
        setAnimating(null);
        load();
      }, Math.max(WATER_ANIMATION_DURATION_MS, soundMs));
    } else {
      showMessage(result.message ?? "澆水失敗");
    }
  }, [load]);

  const handleFertilize = useCallback(
    async (type: "basic" | "premium") => {
      unlockAudio();
      const result = await fertilize(type);
      if (result.success) {
        setFertilizeType(type);
        setAnimating("fertilize");
        const soundMs =
          type === "premium" ? await playSparkleSound() : await playSoilSound();
        showMessage(type === "basic" ? "施用一般肥料成功～" : "施用高級肥料成功～");
        setTimeout(() => {
          setAnimating(null);
          setFertilizeType(null);
          load();
        }, Math.max(FERTILIZE_ANIMATION_DURATION_MS, soundMs));
      } else {
        showMessage(result.message ?? "施肥失敗");
      }
    },
    [load]
  );

  const handleWeed = useCallback(async () => {
    unlockAudio();
    const result = await trimWeeds();
    if (result.success) {
      const weedAch = await incrementWeedsTrimmed();
      if (weedAch.justUnlocked && weedAch.coinsAwarded > 0) {
        showMessage(`成就解鎖：剪雜草 3 次！獲得 ${weedAch.coinsAwarded} 代幣。雜草修剪完成～`);
      } else {
        showMessage("雜草修剪完成～ 成長 +0.1");
      }
      setHasWeeds(false);
      const soundMs = await getScissorSoundDurationMs();
      const totalMs = Math.max(WEED_ANIMATION_MIN_MS, WEED_SNIP_SOUND_DELAY_MS + soundMs);
      setWeedAnimationDurationMs(totalMs);
      setAnimating("weed");
      setTimeout(() => playScissorSound(), WEED_SNIP_SOUND_DELAY_MS);
      setTimeout(() => {
        setAnimating(null);
        load();
      }, totalMs);
    } else {
      showMessage(result.message ?? "除草失敗");
    }
  }, [load]);

  const handleFork = useCallback(async () => {
    unlockAudio();
    const result = await loosenSoil();
    if (result.success) {
      const soundMs = await getSoilSoundDurationMs();
      const totalMs = Math.max(FORK_ANIMATION_MIN_MS, soundMs);
      setForkAnimationDurationMs(totalMs);
      setAnimating("fork");
      showMessage("鬆土完成，成長 +0.12");
      playSoilSound();
      setTimeout(() => {
        setAnimating(null);
        load();
      }, totalMs);
    } else {
      showMessage(result.message ?? "鬆土失敗");
    }
  }, [load]);

  const handleMister = useCallback(async () => {
    unlockAudio();
    const result = await mistPlant();
    if (result.success) {
      const soundMs = await getSpraySoundDurationMs();
      const totalMs = Math.max(MIST_ANIMATION_MIN_MS, soundMs);
      setMistAnimationDurationMs(totalMs);
      setAnimating("mist");
      showMessage("噴霧保濕完成～ 成長 +0.05");
      playSpraySound();
      setTimeout(() => {
        setAnimating(null);
        load();
      }, totalMs);
    } else {
      showMessage(result.message ?? "噴霧失敗");
    }
  }, [load]);

  const handleTrowel = useCallback(async () => {
    unlockAudio();
    const result = await repotPlant();
    if (result.success) {
      playSoilSound();
      showMessage("換盆整理完成，成長 +0.5");
      load();
    } else {
      showMessage(result.message ?? "換盆失敗");
    }
  }, [load]);

  const handleSoil = useCallback(async () => {
    unlockAudio();
    const result = await applyPottingSoil();
    if (result.success) {
      setAnimating("soil");
      const soundMs = await playSoilSound();
      showMessage("營養土已添加，成長加速 +10%");
      setTimeout(() => {
        setAnimating(null);
        load();
      }, Math.max(SOIL_ANIMATION_DURATION_MS, soundMs));
    } else {
      showMessage(result.message ?? "添加失敗");
    }
  }, [load]);

  const handleSpray = useCallback(async () => {
    unlockAudio();
    const result = await removeBugsWithSpray();
    if (result.success) {
      const bugAch = await incrementBugsRemoved();
      if (bugAch.justUnlocked && bugAch.coinsAwarded > 0) {
        showMessage(`成就解鎖：除蟲 5 次！獲得 ${bugAch.coinsAwarded} 代幣。蟲蟲趕走了！`);
      } else {
        showMessage("蟲蟲趕走了！");
      }
      setAnimating("spray");
      const soundMs = await playSpraySound();
      setTimeout(() => {
        setAnimating(null);
        load();
      }, Math.max(SPRAY_ANIMATION_DURATION_MS, soundMs || 0));
    } else {
      showMessage(result.message ?? "除蟲失敗");
    }
  }, [load]);

  const handleSprayBees = useCallback(async () => {
    unlockAudio();
    const result = await removeBeesWithSpray();
    if (result.success) {
      const bugAch = await incrementBugsRemoved();
      if (bugAch.justUnlocked && bugAch.coinsAwarded > 0) {
        showMessage(`成就解鎖：除蟲 5 次！獲得 ${bugAch.coinsAwarded} 代幣。蜜蜂趕走了！`);
      } else {
        showMessage("蜜蜂趕走了！");
      }
      setAnimating("spray");
      const soundMs = await playSpraySound();
      setTimeout(() => {
        setAnimating(null);
        load();
      }, Math.max(SPRAY_ANIMATION_DURATION_MS, soundMs || 0));
    } else {
      showMessage(result.message ?? "驅蜂失敗");
    }
  }, [load]);

  const forkRemainingMs = garden?.lastForkedAt
    ? Math.max(0, FORK_COOLDOWN_MS - (now - garden.lastForkedAt))
    : 0;
  const mistRemainingMs = garden?.lastMistedAt
    ? Math.max(0, MIST_COOLDOWN_MS - (now - garden.lastMistedAt))
    : 0;
  const weedRemainingMs = garden?.lastTrimmedAt
    ? Math.max(0, WEED_COOLDOWN_MS - (now - garden.lastTrimmedAt))
    : 0;
  const hasBugs = garden?.hasBugs ?? false;
  const showBugs = hasBugs;
  const hasBees = garden?.hasBees ?? false;
  const showBees = hasBees;

  const handleHarvest = useCallback(async () => {
    unlockAudio();
    const result = await harvest();
    if (result.success && garden) {
      let harvestMessage: string;
      if (result.coinsAwarded != null) {
        const bloomAch = await unlockFirstBloom();
        const harvestAch = await incrementHarvestCount();
        harvestMessage = bloomAch.justUnlocked && bloomAch.coinsAwarded > 0
          ? `成就解鎖：第一次開花！獲得 ${bloomAch.coinsAwarded} 代幣。收成獲得 ${result.coinsAwarded} 代幣～`
          : `獲得 ${result.coinsAwarded} 代幣！收成完成，可以再種新種子～`;
        if (harvestAch.coinsAwarded > 0) {
          const names: string[] = [];
          if (harvestAch.harvest3JustUnlocked) names.push("豐收");
          if (harvestAch.harvest10JustUnlocked) names.push("熟練園丁");
          harvestMessage += ` 成就解鎖：${names.join("、")}！獲得 ${harvestAch.coinsAwarded} 代幣。`;
        }
      } else {
        harvestMessage = "收成完成，可以再種新種子～";
      }
      setHarvestingGarden(garden);
      setGarden(null);
      setTimeout(() => {
        setHarvestingGarden(null);
        showMessage(harvestMessage);
        playCelebrationSound();
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
        load();
      }, 500);
    }
  }, [load, garden]);

  /** 合照模態：開啟時啟動相機，關閉時停止 */
  useEffect(() => {
    if (!showPhotoModal) {
      photoStreamRef.current?.getTracks().forEach((t) => t.stop());
      photoStreamRef.current = null;
      return;
    }
    setPhotoCompositeBlob(null);
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((s) => {
        stream = s;
        photoStreamRef.current = s;
        if (photoVideoRef.current) {
          photoVideoRef.current.srcObject = s;
        }
      })
      .catch(() => {
        showMessage("無法使用相機，請允許相機權限");
        setShowPhotoModal(false);
      });
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [showPhotoModal]);

  const handleTakePhoto = useCallback(() => {
    const video = photoVideoRef.current;
    if (!video || video.readyState < 2) return;
    const seedId = garden?.seedId ?? "grape";
    const plantPath = getSeedGrowthImagePath(seedId, 4);
    const plantUrl = typeof window !== "undefined" ? window.location.origin + plantPath : plantPath;
    const w = 600;
    const h = 800;
    const maxPlantH = h / 3;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawSelfieAsBackground = (mirror: boolean) => {
      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const temp = document.createElement("canvas");
      temp.width = vw;
      temp.height = vh;
      const tCtx = temp.getContext("2d");
      if (!tCtx) return;
      tCtx.drawImage(video, 0, 0, vw, vh);
      const scale = Math.max(w / vw, h / vh);
      const destW = vw * scale;
      const destH = vh * scale;
      const destX = (w - destW) / 2;
      const destY = (h - destH) / 2;
      if (mirror) {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(-1, 1);
        ctx.translate(-w / 2, -h / 2);
        ctx.drawImage(temp, 0, 0, vw, vh, destX, destY, destW, destH);
        ctx.restore();
      } else {
        ctx.drawImage(temp, 0, 0, vw, vh, destX, destY, destW, destH);
      }
    };

    const plantImg = new window.Image();
    plantImg.onload = () => {
      drawSelfieAsBackground(true);
      const scale = Math.min(w / plantImg.naturalWidth, maxPlantH / plantImg.naturalHeight);
      const dw = plantImg.naturalWidth * scale;
      const dh = plantImg.naturalHeight * scale;
      const dx = (w - dw) / 2;
      const dy = h - dh;
      ctx.drawImage(plantImg, 0, 0, plantImg.naturalWidth, plantImg.naturalHeight, dx, dy, dw, dh);
      canvas.toBlob(
        (blob) => {
          if (blob) setPhotoCompositeBlob(blob);
        },
        "image/png",
        0.92
      );
    };
    plantImg.onerror = () => {
      drawSelfieAsBackground(true);
      canvas.toBlob((blob) => blob && setPhotoCompositeBlob(blob), "image/png", 0.92);
    };
    plantImg.src = plantUrl;
  }, [garden]);

  const handleDownloadPhoto = useCallback(() => {
    if (!photoCompositeBlob) return;
    const url = URL.createObjectURL(photoCompositeBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "與植物合照.png";
    a.click();
    URL.revokeObjectURL(url);
  }, [photoCompositeBlob]);

  const handleSharePhoto = useCallback(async () => {
    if (!photoCompositeBlob) return;
    const file = new File([photoCompositeBlob], "與植物合照.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "與植物合照" });
        setShowPhotoModal(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") showMessage("分享失敗");
      }
    } else {
      handleDownloadPhoto();
    }
  }, [photoCompositeBlob, handleDownloadPhoto]);

  const handleChangePlantConfirm = useCallback(async () => {
    if (!changePlantSelectedSeedId) return;
    const clearResult = await clearGardenWithoutHarvest();
    if (!clearResult.success) {
      showMessage(clearResult.message ?? "清除失敗");
      return;
    }
    const plantResult = await plantSeed(changePlantSelectedSeedId);
    if (plantResult.success) {
      showMessage(`已改種為 ${SEED_NAMES[changePlantSelectedSeedId] ?? changePlantSelectedSeedId}`);
      setShowChangePlantModal(false);
      setChangePlantSelectedSeedId(null);
      setChangePlantConfirming(false);
      load();
    } else {
      showMessage(plantResult.message ?? "種植失敗");
    }
  }, [changePlantSelectedSeedId, load]);

  const SEED_IDS = ["pink_flower", "sun_flower", "tomato", "rose", "brocoli", "tulip", "Lavender", "daffodils", "peach", "grape", "orchid", "cactus", "strawberry", "blueberry", "tangerine"];

  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-10">
      {showCelebration && <CelebrationParticles />}
      <div className="flex w-full max-w-lg flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/" className="font-semibold text-[var(--primary)] hover:underline">
            ← 返回首頁
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="hidden text-sm font-medium text-gray-500 hover:text-gray-700 underline"
            >
              測試合照
            </button>
            <Link href="/shop?from=garden" className="font-semibold text-[var(--primary)] hover:underline">
              商店
            </Link>
          </div>
        </div>
        <h1 className="text-center text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
          🌱 我的花園
        </h1>
        {message && (
          <p className="rounded-xl bg-amber-100 px-4 py-2 text-center font-semibold text-amber-900 shadow-sm" role="status">
            {message}
          </p>
        )}
        {!garden && (
          <div className="flex flex-col items-center gap-5 rounded-3xl border-2 border-green-200 bg-white/90 p-6 shadow-lg">
            <p className="text-center text-gray-600">還沒有植物，選一顆種子種下吧！</p>
            {plantingSeedId ? (
              <div className="flex flex-wrap justify-center gap-3">
                {(inventory?.seeds ?? {})[plantingSeedId] != null && (inventory?.seeds ?? {})[plantingSeedId] > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePlant(plantingSeedId)}
                      className="min-h-[48px] rounded-2xl bg-[var(--primary)] px-6 font-bold text-white shadow-md hover:bg-[var(--primary-hover)] active:scale-[0.98]"
                    >
                      確認種植 {SEED_NAMES[plantingSeedId] ?? plantingSeedId}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlantingSeedId(null)}
                      className="min-h-[48px] rounded-2xl border-2 border-gray-300 px-6 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">沒有此種子，請到商店購買</p>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-4">
                {SEED_IDS.map((seedId) => (
                  <button
                    key={seedId}
                    type="button"
                    onClick={() => setPlantingSeedId(seedId)}
                    disabled={((inventory?.seeds ?? {})[seedId] ?? 0) < 1}
                    className="flex flex-col items-center gap-2 rounded-2xl border-2 border-green-200 bg-green-50/80 p-4 transition hover:border-green-400 hover:bg-green-100 disabled:opacity-50"
                  >
                    <div className="relative h-16 w-16">
                      <Image
                        src={getSeedGrowthImagePath(seedId, 0)}
                        alt=""
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <span className="font-bold text-[var(--foreground)]">{SEED_NAMES[seedId] ?? seedId}</span>
                    <span className="text-sm text-gray-500">× {(inventory?.seeds ?? {})[seedId] ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {(garden || harvestingGarden) && (() => {
          const displayGarden = garden ?? harvestingGarden!;
          const isHarvesting = !!harvestingGarden;
          return (
          <div className="flex flex-col items-center gap-6 rounded-3xl border-2 border-green-200 bg-white/90 p-6 shadow-lg">
            <p className="text-center text-lg font-bold text-[var(--foreground)]">
              {SEED_NAMES[displayGarden.seedId] ?? displayGarden.seedId}
              {displayGarden.isBloom && " 🌸 已開花"}
            </p>
            <div className="relative h-48 w-48 sm:h-56 sm:w-56">
              {/* 植物層：獨立 stacking context，確保工具動畫一定在前 */}
              <div className="garden-plant-layer absolute inset-0">
                <Image
                  src={getSeedGrowthImagePath(displayGarden.seedId, displayGarden.growthStage)}
                  alt=""
                  fill
                  className={`object-contain ${isHarvesting ? "garden-harvest-plant-exit" : "garden-plant-sway"}`}
                  unoptimized
                />
              </div>
              {/* 開花瞬間：花苞位置光團放大＋淡出 */}
              {garden && showBloomFlash && <span className="garden-bloom-flash" aria-hidden />}
              {/* 土壤層：始終存在，高度不超過雜草底，僅一薄條地面 */}
              <div
                className="garden-weed-soil pointer-events-none absolute left-0 right-0 bottom-0 h-[6%] rounded-t-[30%]"
                style={{
                  background: "linear-gradient(180deg, rgba(139, 90, 43, 0.85) 0%, rgba(101, 67, 33, 0.9) 50%, rgba(80, 52, 28, 0.95) 100%)",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)",
                }}
                aria-hidden
              />
              {!isHarvesting && showBugs && !displayGarden.isBloom && (
                <div
                  className="pointer-events-none absolute inset-0 z-[8] flex items-center justify-center gap-1"
                  aria-hidden
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={`bug-${i}`}
                      className="garden-bug-float text-2xl sm:text-3xl opacity-90"
                      style={{
                        position: "absolute",
                        top: `${28 + (i % 3) * 20}%`,
                        left: `${30 + (i % 2) * 28 + i * 4}%`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    >
                      🐛
                    </span>
                  ))}
                </div>
              )}
              {!isHarvesting && showBees && !displayGarden.isBloom && (
                <div
                  className="pointer-events-none absolute inset-0 z-[8] flex items-center justify-center"
                  aria-hidden
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={`bee-${i}`}
                      className="garden-bug-float absolute opacity-90"
                      style={{
                        top: `${22 + (i % 3) * 22}%`,
                        left: `${18 + (i % 2) * 32 + (i === 2 ? 16 : 0)}%`,
                        width: 48,
                        height: 48,
                        animationDelay: `${i * 0.25}s`,
                      }}
                    >
                      <Image
                        src="/garden-assets/bee/bee_flying_animation.gif"
                        alt=""
                        width={48}
                        height={48}
                        className="h-full w-full object-contain"
                        unoptimized
                      />
                    </span>
                  ))}
                </div>
              )}
              {!isHarvesting && hasWeeds && (
                <div
                  className={`pointer-events-none absolute bottom-0 left-0 right-0 h-[45%] overflow-hidden ${animating === "weed" ? "garden-animate-weed garden-weed-layer" : ""}`}
                  style={animating === "weed" ? ({ "--weed-duration": `${weedAnimationDurationMs}ms` } as React.CSSProperties) : undefined}
                  aria-hidden
                >
                  {WEED_POSITIONS.map((pos, i) => (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        top: pos.top,
                        bottom: pos.bottom,
                        left: pos.left,
                        right: pos.right,
                        width: pos.size,
                        height: pos.size,
                      }}
                    >
                      <Image
                        src={GRASS_IMAGES[i % GRASS_IMAGES.length]}
                        alt=""
                        fill
                        className="object-contain drop-shadow-md"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}
              {animating === "water" && (
                <div className="garden-animate-water pointer-events-none absolute inset-0 z-[20] overflow-visible">
                  <div className="garden-watering-can-wrap">
                    <Image
                      src={wateringCanImagePath}
                      alt=""
                      width={80}
                      height={80}
                      className="garden-watering-can-pour object-contain"
                      unoptimized
                    />
                  </div>
                  {/* 水滴：多一層較慢的錯開，總 12 顆 */}
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <span
                      key={i}
                      className="garden-water-dot absolute top-0 h-2 w-2 rounded-full bg-blue-400/90"
                      style={{
                        left: `${15 + (i % 4) * 22}%`,
                        animationDelay: `${0.6 + i * 0.15}s`,
                      }}
                    />
                  ))}
                  {[8, 9, 10, 11].map((i) => (
                    <span
                      key={i}
                      className="garden-water-dot absolute top-0 h-1.5 w-1.5 rounded-full bg-blue-300/80"
                      style={{
                        left: `${20 + ((i - 8) % 2) * 35}%`,
                        animationDelay: `${0.9 + (i - 8) * 0.25}s`,
                      }}
                    />
                  ))}
                  {/* 水花環：內層 3 個 + 外層 2 個 */}
                  {[0, 1, 2].map((i) => (
                    <span
                      key={`splash-${i}`}
                      className="garden-water-splash-ring absolute bottom-[18%] left-1/2 h-10 w-10 -translate-x-1/2 rounded-full border-2 border-blue-300/70"
                      style={{
                        animationDelay: `${1.2 + i * 0.35}s`,
                      }}
                    />
                  ))}
                  {[0, 1].map((i) => (
                    <span
                      key={`splash-outer-${i}`}
                      className="garden-water-splash-ring-outer absolute bottom-[18%] left-1/2 h-12 w-12 -translate-x-1/2 rounded-full border-2 border-blue-200/60"
                      style={{
                        animationDelay: `${1.35 + i * 0.3}s`,
                      }}
                    />
                  ))}
                  {/* 葉面反光 */}
                  <span
                    className="garden-water-leaf-shine absolute w-[14%] h-[7%]"
                    style={{
                      top: "38%",
                      left: "38%",
                      animationDelay: "1.15s",
                    }}
                  />
                  <span
                    className="garden-water-leaf-shine absolute w-[12%] h-[6%]"
                    style={{
                      top: "46%",
                      left: "48%",
                      animationDelay: "1.4s",
                    }}
                  />
                  {/* 完成閃光 */}
                  <span
                    className="garden-water-complete-flash"
                    style={{ animationDelay: "2.4s" }}
                  />
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={`spark-${i}`}
                      className="garden-water-sparkle absolute h-2 w-2 rounded-sm bg-sky-200"
                      style={{
                        top: `${36 + (i % 3) * 14}%`,
                        left: `${26 + (i % 2) * 22 + i * 3}%`,
                        animationDelay: `${0.9 + i * 0.18}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              {animating === "fork" && (
                <div
                  className="garden-animate-fork garden-fork-layer pointer-events-none absolute inset-0 overflow-visible"
                  style={{ ["--fork-duration" as string]: `${forkAnimationDurationMs}ms` }}
                >
                  <div className="garden-tool-fork-wrap relative">
                    <Image
                      src={GARDEN_FORK_IMAGE}
                      alt=""
                      width={52}
                      height={52}
                      className="garden-tool-fork-swing object-contain"
                      unoptimized
                    />
                    <span className="garden-fork-metal-flash absolute inset-0" aria-hidden />
                  </div>
                  <div className="garden-fork-shake-layer absolute inset-0 rounded-full" />
                  {/* 土粒：快批 */}
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <span
                      key={`dirt-${i}`}
                      className="garden-fork-dirt absolute h-2 w-2 rounded-full bg-amber-600/80"
                      style={{
                        top: `${40 + (i % 3) * 12}%`,
                        left: `${30 + (i % 4) * 14}%`,
                        animationDelay: `${0.1 + i * 0.08}s`,
                      }}
                    />
                  ))}
                  {/* 土粒：慢批 */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={`dirt-slow-${i}`}
                      className="garden-fork-dirt absolute h-2 w-2 rounded-full bg-amber-500/75"
                      style={{
                        top: `${38 + (i % 2) * 16}%`,
                        left: `${26 + (i % 3) * 18}%`,
                        animationDelay: `${0.35 + i * 0.14}s`,
                      }}
                    />
                  ))}
                  {/* 小石頭：深褐色略大 */}
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={`stone-${i}`}
                      className="garden-fork-stone absolute h-2.5 w-2.5 rounded-full bg-amber-800/90"
                      style={{
                        top: `${42 + (i % 2) * 10}%`,
                        left: `${32 + (i % 2) * 24}%`,
                        animationDelay: `${0.2 + i * 0.18}s`,
                      }}
                    />
                  ))}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={`fork-spark-${i}`}
                      className="garden-fork-sparkle absolute h-3 w-3 rounded-sm bg-amber-100"
                      style={{
                        top: `${32 + (i % 3) * 16}%`,
                        left: `${28 + (i % 2) * 22 + i * 3}%`,
                        animationDelay: `${0.2 + i * 0.12}s`,
                      }}
                    />
                  ))}
                  {/* 鬆土完成閃光 */}
                  <span
                    className="garden-fork-complete-flash"
                    style={{ animationDelay: `${Math.max(0, forkAnimationDurationMs - 120)}ms` }}
                    aria-hidden
                  />
                </div>
              )}
              {animating === "mist" && (
                <div
                  className="garden-animate-mist pointer-events-none absolute inset-0 z-[20] overflow-visible"
                  style={{ ["--mist-duration" as string]: `${mistAnimationDurationMs}ms` }}
                >
                  <div className="garden-tool-mist-wrap">
                    <Image
                      src={PLANT_MISTER_IMAGE}
                      alt=""
                      width={52}
                      height={52}
                      className="garden-tool-mist-swing object-contain"
                      unoptimized
                    />
                  </div>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={`mist-${i}`}
                      className="garden-mist-cloud absolute h-10 w-10 rounded-full bg-sky-200/70"
                      style={{
                        top: `${30 + (i % 3) * 14}%`,
                        left: `${25 + (i % 2) * 20 + i * 4}%`,
                        animationDelay: `${0.05 + i * 0.12}s`,
                      }}
                    />
                  ))}
                  {/* 第二層霧：大、慢、模糊 */}
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={`mist-outer-${i}`}
                      className="garden-mist-cloud-outer absolute h-14 w-14 rounded-full bg-sky-200/50"
                      style={{
                        top: `${28 + (i % 2) * 18}%`,
                        left: `${22 + (i % 2) * 26 + i * 5}%`,
                        animationDelay: `${0.15 + i * 0.18}s`,
                      }}
                    />
                  ))}
                  {/* 葉片掛珠：噴霧中後段出現 */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={`mist-bead-${i}`}
                      className="garden-mist-leaf-bead"
                      style={{
                        width: 6,
                        height: 6,
                        top: `${36 + (i % 3) * 16}%`,
                        left: `${30 + (i % 3) * 20}%`,
                        animationDelay: `${0.55 + i * 0.08}s`,
                      }}
                    />
                  ))}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={`mist-spark-${i}`}
                      className="garden-mist-sparkle absolute h-2 w-2 rounded-sm bg-sky-100"
                      style={{
                        top: `${38 + (i % 3) * 12}%`,
                        left: `${32 + (i % 2) * 18 + i * 3}%`,
                        animationDelay: `${0.2 + i * 0.15}s`,
                      }}
                    />
                  ))}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={`mist-drop-${i}`}
                      className="garden-mist-drop absolute h-2 w-2 rounded-full bg-sky-300"
                      style={{
                        top: `${40 + (i % 3) * 12}%`,
                        left: `${24 + (i % 4) * 14}%`,
                        animationDelay: `${0.3 + i * 0.1}s`,
                      }}
                    />
                  ))}
                  <span
                    className="garden-mist-complete-flash"
                    style={{ animationDelay: `${Math.round(mistAnimationDurationMs * 0.85)}ms` }}
                    aria-hidden
                  />
                </div>
              )}
              {animating === "soil" && (
                <div className="garden-animate-soil pointer-events-none absolute inset-0 z-[20] overflow-visible">
                  <div className="garden-soil-bag-wrap">
                    <Image
                      src={POTTING_SOIL_IMAGE}
                      alt=""
                      width={86}
                      height={86}
                      className="garden-soil-bag-pour object-contain"
                      unoptimized
                    />
                  </div>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <span
                      key={`soil-${i}`}
                      className="garden-soil-particle absolute h-2.5 w-2.5 rounded-full bg-amber-700/80"
                      style={{
                        top: `${34 + (i % 4) * 14}%`,
                        left: `${26 + (i % 4) * 14}%`,
                        animationDelay: `${0.2 + i * 0.1}s`,
                      }}
                    />
                  ))}
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={`soil-spark-${i}`}
                      className="garden-soil-sparkle absolute h-3 w-3 rounded-sm bg-amber-100"
                      style={{
                        top: `${30 + (i % 2) * 18}%`,
                        left: `${38 + i * 10}%`,
                        animationDelay: `${0.35 + i * 0.12}s`,
                      }}
                    />
                  ))}
                  <span
                    className="garden-soil-ground-shine"
                    style={{ animationDelay: "0.75s" }}
                    aria-hidden
                  />
                  <span
                    className="garden-soil-complete-flash"
                    style={{ animationDelay: "1100ms" }}
                    aria-hidden
                  />
                </div>
              )}
              {animating === "fertilize" && (
                <div
                  className={`pointer-events-none absolute inset-0 z-[20] overflow-visible ${fertilizeType === "premium" ? "garden-animate-fertilize-premium" : "garden-animate-fertilize-basic"}`}
                >
                  <div className="garden-fertilize-product-wrap relative">
                    <Image
                      src={fertilizeType === "premium" ? FERTILIZER_PREMIUM_IMAGE : FERTILIZER_BASIC_IMAGE}
                      alt=""
                      width={80}
                      height={80}
                      className="garden-fertilize-product-pour object-contain"
                      unoptimized
                    />
                    <span className="garden-fertilize-mouth-glow absolute" aria-hidden />
                  </div>
                  {/* 一般肥料：琥珀色粒子（袋裝撒落感，落地彈跳） */}
                  {fertilizeType === "basic" &&
                    [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <span
                        key={`p-${i}`}
                        className="garden-fertilize-particle absolute h-3 w-3 rounded-full bg-amber-300"
                        style={{
                          top: `${28 + (i % 4) * 16}%`,
                          left: `${18 + Math.floor(i / 4) * 26}%`,
                          animationDelay: `${0.5 + i * 0.11}s`,
                        }}
                      />
                    ))}
                  {/* 高級肥料：紫色光點 + 三層光環 + 星形閃爍 */}
                  {fertilizeType === "premium" && (
                    <>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                        <span
                          key={`premium-${i}`}
                          className="garden-fertilize-particle-premium absolute h-2.5 w-2.5 rounded-full bg-purple-400"
                          style={{
                            top: `${22 + (i % 4) * 18}%`,
                            left: `${12 + Math.floor(i / 4) * 28}%`,
                            animationDelay: `${0.3 + i * 0.14}s`,
                          }}
                        />
                      ))}
                      <div className="garden-fertilize-premium-glow" aria-hidden />
                      <div className="garden-fertilize-premium-glow-ring-2" aria-hidden />
                      <div className="garden-fertilize-premium-glow-ring-3" aria-hidden />
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span
                          key={`star-${i}`}
                          className="garden-fertilize-star"
                          style={{
                            top: `${32 + (i % 2) * 22}%`,
                            left: `${28 + (i % 3) * 18}%`,
                            animationDelay: `${0.5 + i * 0.18}s`,
                          }}
                        />
                      ))}
                    </>
                  )}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={`fert-spark-${i}`}
                      className="garden-fertilize-sparkle absolute h-3 w-3 rounded-sm bg-yellow-100"
                      style={{
                        top: `${26 + (i % 3) * 18}%`,
                        left: `${30 + (i % 2) * 18 + i * 4}%`,
                        animationDelay: `${0.6 + i * 0.2}s`,
                      }}
                    />
                  ))}
                  {/* 施肥完成閃光 */}
                  <span
                    className="garden-fertilize-complete-flash"
                    style={{ animationDelay: "2.85s" }}
                    aria-hidden
                  />
                </div>
              )}
              {animating === "weed" && (
                <div
                  className="garden-animate-weed garden-weed-shake-container pointer-events-none absolute inset-0 z-[20] overflow-visible"
                  style={{ ["--weed-duration" as string]: `${weedAnimationDurationMs}ms` }}
                >
                  <div className="garden-weed-scissors-wrap relative">
                    <Image
                      src={GARDEN_SCISSORS_IMAGE}
                      alt=""
                      width={86}
                      height={86}
                      className="garden-weed-scissors-snap object-contain"
                      style={{ animationDuration: `${weedAnimationDurationMs}ms` }}
                      unoptimized
                    />
                    <span
                      className="garden-weed-blade-flash"
                      style={{ animationDelay: `${weedAnimationDurationMs * 0.28}ms` }}
                      aria-hidden
                    />
                  </div>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={`snip-${i}`}
                      className="garden-weed-snip absolute h-8 w-8 rounded-full border-2 border-green-200/70"
                      style={{
                        top: `${28 + i * 16}%`,
                        left: `${40 + (i % 2) * 12}%`,
                        animationDelay: `${0.1 + i * 0.12}s`,
                        animationDuration: `${weedAnimationDurationMs}ms`,
                      }}
                    />
                  ))}
                  {/* 草屑飛散 */}
                  <span className="garden-weed-debris garden-weed-debris-1" style={{ bottom: "22%", left: "38%" }} aria-hidden />
                  <span className="garden-weed-debris garden-weed-debris-2" style={{ bottom: "20%", left: "48%" }} aria-hidden />
                  <span className="garden-weed-debris garden-weed-debris-3" style={{ bottom: "24%", left: "42%" }} aria-hidden />
                  <span className="garden-weed-debris garden-weed-debris-4" style={{ bottom: "18%", left: "52%" }} aria-hidden />
                  {/* 完成閃光 */}
                  <span
                    className="garden-weed-complete-flash"
                    style={{ animationDelay: `${weedAnimationDurationMs * 0.8}ms` }}
                    aria-hidden
                  />
                </div>
              )}
              {animating === "spray" && (
                <div
                  className="garden-animate-spray pointer-events-none absolute inset-0 z-[20] overflow-visible"
                  style={{ ["--spray-duration" as string]: `${SPRAY_ANIMATION_DURATION_MS}ms` }}
                >
                  <div className="garden-tool-spray-wrap">
                    <Image
                      src={INSECTICIDE_SPRAY_IMAGE}
                      alt=""
                      width={56}
                      height={56}
                      className="garden-tool-spray-swing object-contain"
                      unoptimized
                    />
                  </div>
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <span
                      key={`spray-cloud-${i}`}
                      className="garden-spray-cloud absolute h-10 w-10 rounded-full bg-emerald-200/60"
                      style={{
                        top: `${28 + (i % 3) * 16}%`,
                        left: `${22 + (i % 2) * 24 + i * 3}%`,
                        animationDelay: `${0.08 + i * 0.1}s`,
                      }}
                    />
                  ))}
                  {/* 第二層雲：半透明、藥劑感 */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={`spray-cloud-outer-${i}`}
                      className="garden-spray-cloud-outer absolute h-12 w-12 rounded-full bg-emerald-100/50"
                      style={{
                        top: `${26 + (i % 2) * 20}%`,
                        left: `${20 + (i % 2) * 28 + i * 4}%`,
                        animationDelay: `${0.2 + i * 0.14}s`,
                      }}
                    />
                  ))}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={`spray-drop-${i}`}
                      className="garden-spray-drop absolute h-2 w-2 rounded-full bg-emerald-300/80"
                      style={{
                        top: `${36 + (i % 3) * 14}%`,
                        left: `${26 + (i % 4) * 14}%`,
                        animationDelay: `${0.2 + i * 0.12}s`,
                      }}
                    />
                  ))}
                  <span
                    className="garden-spray-complete-flash"
                    style={{ animationDelay: `${Math.round(SPRAY_ANIMATION_DURATION_MS * 0.88)}ms` }}
                    aria-hidden
                  />
                </div>
              )}
            </div>
            {garden && showBugs && !garden.isBloom && (
              <p className="rounded-xl bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900 shadow-sm">
                植物有蟲害，成長變慢囉！快除蟲～
              </p>
            )}
            {garden && showBees && !garden.isBloom && (
              <p className="rounded-xl bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900 shadow-sm">
                有蜜蜂在飛，植物成長變慢囉！快驅蜂～
              </p>
            )}
            {garden && !garden.isBloom && (
              <div className="flex flex-wrap justify-center gap-3">
                {showBugs && (
                  <button
                    type="button"
                    onClick={handleSpray}
                    disabled={animating !== null || (inventory?.insecticide ?? 0) < 1}
                    title={(inventory?.insecticide ?? 0) < 1 ? "請到商店購買殺蟲劑" : undefined}
                    className="min-h-[48px] rounded-2xl bg-red-100 px-6 font-bold text-red-800 shadow-sm disabled:opacity-50 hover:bg-red-200 active:scale-[0.98] disabled:cursor-not-allowed"
                  >
                    🐛 噴殺蟲劑（× {inventory?.insecticide ?? 0}）
                  </button>
                )}
                {showBees && (
                  <button
                    type="button"
                    onClick={handleSprayBees}
                    disabled={animating !== null || (inventory?.insecticide ?? 0) < 1}
                    title={(inventory?.insecticide ?? 0) < 1 ? "請到商店購買殺蟲劑" : undefined}
                    className="min-h-[48px] rounded-2xl bg-amber-100 px-6 font-bold text-amber-800 shadow-sm disabled:opacity-50 hover:bg-amber-200 active:scale-[0.98] disabled:cursor-not-allowed"
                  >
                    🐝 驅蜂（殺蟲劑 × {inventory?.insecticide ?? 0}）
                  </button>
                )}
                {hasWeeds && (
                  <button
                    type="button"
                    onClick={handleWeed}
                    disabled={animating !== null || (inventory?.tools?.garden_scissors ?? 0) < 1 || weedRemainingMs > 0}
                    title={(inventory?.tools?.garden_scissors ?? 0) < 1 ? "請先至商店購買園藝剪刀" : weedRemainingMs > 0 ? "冷卻中" : undefined}
                    className="min-h-[48px] rounded-2xl bg-green-600 px-6 font-bold text-white shadow-md disabled:opacity-50 hover:bg-green-700 active:scale-[0.98] disabled:cursor-not-allowed"
                  >
                    ✂️ 修剪雜草
                    {(inventory?.tools?.garden_scissors ?? 0) < 1 && (
                      <span className="ml-1 text-xs font-normal opacity-90">（需園藝剪刀）</span>
                    )}
                    {weedRemainingMs > 0 && ` · 冷卻 ${formatCooldown(weedRemainingMs)}`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleWater}
                  disabled={(inventory?.water ?? 0) < 1 || animating !== null}
                  className="min-h-[48px] rounded-2xl bg-blue-100 px-6 font-bold text-blue-800 shadow-sm disabled:opacity-50 hover:bg-blue-200 active:scale-[0.98]"
                >
                  <span className="garden-action-icon">💧</span> 澆水（水 × {inventory?.water ?? 0}）
                </button>
                <button
                  type="button"
                  onClick={() => handleFertilize("basic")}
                  disabled={(inventory?.fertilizerBasic ?? 0) < 1 || animating !== null}
                  className="min-h-[48px] rounded-2xl bg-amber-100 px-6 font-bold text-amber-800 shadow-sm disabled:opacity-50 hover:bg-amber-200 active:scale-[0.98]"
                >
                  <span className="garden-action-icon">🌿</span> 一般肥料（× {inventory?.fertilizerBasic ?? 0}）
                </button>
                <button
                  type="button"
                  onClick={() => handleFertilize("premium")}
                  disabled={(inventory?.fertilizerPremium ?? 0) < 1 || animating !== null}
                  className="min-h-[48px] rounded-2xl bg-purple-100 px-6 font-bold text-purple-800 shadow-sm disabled:opacity-50 hover:bg-purple-200 active:scale-[0.98]"
                >
                  <span className="garden-action-icon">✨</span> 高級肥料（× {inventory?.fertilizerPremium ?? 0}）
                </button>
                {((inventory?.tools?.garden_fork ?? 0) > 0 ||
                  (inventory?.tools?.plant_mister ?? 0) > 0 ||
                  (inventory?.tools?.garden_trowel ?? 0) > 0 ||
                  (inventory?.tools?.potting_soil ?? 0) > 0) && (
                  <div className="flex w-full flex-wrap justify-center gap-3">
                    {(inventory?.tools?.garden_fork ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={handleFork}
                        disabled={animating !== null || forkRemainingMs > 0}
                        className="min-h-[48px] rounded-2xl bg-emerald-100 px-4 font-bold text-emerald-800 shadow-sm disabled:opacity-50 hover:bg-emerald-200 active:scale-[0.98]"
                      >
                        <span className="garden-action-icon">🪴</span> 鬆土（園藝叉）
                        {forkRemainingMs > 0 && ` · 冷卻 ${formatCooldown(forkRemainingMs)}`}
                      </button>
                    )}
                    {(inventory?.tools?.plant_mister ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={handleMister}
                        disabled={animating !== null || mistRemainingMs > 0}
                        className="min-h-[48px] rounded-2xl bg-sky-100 px-4 font-bold text-sky-800 shadow-sm disabled:opacity-50 hover:bg-sky-200 active:scale-[0.98]"
                      >
                        <span className="garden-action-icon">💧</span> 噴霧保濕
                        {mistRemainingMs > 0 && ` · 冷卻 ${formatCooldown(mistRemainingMs)}`}
                      </button>
                    )}
                    {(inventory?.tools?.garden_trowel ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={handleTrowel}
                        disabled={animating !== null}
                        className="min-h-[48px] rounded-2xl bg-orange-100 px-4 font-bold text-orange-800 shadow-sm disabled:opacity-50 hover:bg-orange-200 active:scale-[0.98]"
                      >
                        <span className="garden-action-icon">🧤</span> 換盆整理（園藝鏟）
                      </button>
                    )}
                    {(inventory?.tools?.potting_soil ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={handleSoil}
                        disabled={animating !== null}
                        className="min-h-[48px] rounded-2xl bg-amber-100 px-4 font-bold text-amber-800 shadow-sm disabled:opacity-50 hover:bg-amber-200 active:scale-[0.98]"
                      >
                        <span className="garden-action-icon">🌱</span> 添加營養土
                      </button>
                    )}
                  </div>
                )}
                {(inventory?.tools?.fertilizer_bottle ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 shadow-sm">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">✓</span>
                    肥料瓶加成啟用
                  </span>
                )}
              </div>
            )}
            {garden && !isHarvesting && (
              <button
                type="button"
                onClick={() => {
                  setChangePlantSelectedSeedId(null);
                  setChangePlantConfirming(false);
                  setShowChangePlantModal(true);
                }}
                className="min-h-[48px] rounded-2xl border-2 border-amber-300 bg-amber-50 px-6 font-bold text-amber-800 shadow-sm hover:bg-amber-100 active:scale-[0.98]"
              >
                🔄 變更植物
              </button>
            )}
            {garden?.isBloom && !isHarvesting && (
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(true)}
                  className="min-h-[48px] rounded-2xl border-2 border-green-500 bg-green-50 px-6 font-bold text-green-700 shadow-sm hover:bg-green-100 active:scale-[0.98]"
                >
                  📷 合照
                </button>
                <button
                  type="button"
                  onClick={handleHarvest}
                  className="min-h-[48px] rounded-2xl bg-[var(--primary)] px-6 font-bold text-white shadow-md hover:bg-[var(--primary-hover)] active:scale-[0.98]"
                >
                  🌸 收成（可再種新種子）
                </button>
              </div>
            )}
          </div>
          );
        })()}
        {showPhotoModal && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-modal-title"
          >
            <div className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border-2 border-green-200 bg-white p-4 shadow-xl">
              <h2 id="photo-modal-title" className="text-center text-lg font-bold text-[var(--foreground)]">
                📷 與植物合照
              </h2>
              {!photoCompositeBlob ? (
                <>
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-900">
                    <video
                      ref={photoVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover mirror-selfie"
                      style={{ transform: "scaleX(-1)" }}
                    />
                  </div>
                  <p className="text-center text-sm text-gray-600">對準鏡頭後按「拍照」</p>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleTakePhoto}
                      className="min-h-[48px] rounded-xl bg-green-600 px-6 font-bold text-white hover:bg-green-700"
                    >
                      拍照
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(false)}
                      className="min-h-[48px] rounded-xl border-2 border-gray-300 px-6 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gray-100">
                    {photoPreviewUrl && (
                      <img
                        src={photoPreviewUrl}
                        alt="與植物合照"
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadPhoto}
                      className="min-h-[48px] rounded-xl bg-[var(--primary)] px-6 font-bold text-white hover:bg-[var(--primary-hover)]"
                    >
                      下載
                    </button>
                    {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                      <button
                        type="button"
                        onClick={handleSharePhoto}
                        className="min-h-[48px] rounded-xl bg-green-600 px-6 font-bold text-white hover:bg-green-700"
                      >
                        儲存／分享
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhotoModal(false);
                        setPhotoCompositeBlob(null);
                      }}
                      className="min-h-[48px] rounded-xl border-2 border-gray-300 px-6 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      關閉
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {achievements && (
          <div className="w-full rounded-2xl border border-amber-200 bg-amber-50/80 p-3 sm:p-4">
            <h2 className="mb-2 text-center text-sm font-bold text-amber-900 sm:text-base">🏅 成就徽章</h2>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div
                className={`rounded-xl border-2 px-3 py-2 text-center text-xs sm:text-sm ${
                  achievements.firstBloomUnlocked
                    ? "border-amber-400 bg-amber-100 text-amber-900"
                    : "border-gray-200 bg-white/60 text-gray-500"
                }`}
                title="第一次開花：收成開花株"
              >
                <span className="font-semibold">🌸 第一次開花</span>
                {achievements.firstBloomUnlocked && <span className="ml-1">✓</span>}
              </div>
              <div
                className={`rounded-xl border-2 px-3 py-2 text-center text-xs sm:text-sm ${
                  achievements.gardenStreak7Unlocked
                    ? "border-amber-400 bg-amber-100 text-amber-900"
                    : "border-gray-200 bg-white/60 text-gray-500"
                }`}
                title="連續 7 天進花園"
              >
                <span className="font-semibold">📅 連續 7 天進花園</span>
                {achievements.gardenStreak7Unlocked ? (
                  <span className="ml-1">✓</span>
                ) : (
                  <span className="block text-xs">({achievements.gardenConsecutiveDays}/7 天)</span>
                )}
              </div>
              <div
                className={`rounded-xl border-2 px-3 py-2 text-center text-xs sm:text-sm ${
                  achievements.bugsRemoved5Unlocked
                    ? "border-amber-400 bg-amber-100 text-amber-900"
                    : "border-gray-200 bg-white/60 text-gray-500"
                }`}
                title="除蟲 5 次"
              >
                <span className="font-semibold">🐛 除蟲 5 次</span>
                {achievements.bugsRemoved5Unlocked ? (
                  <span className="ml-1">✓</span>
                ) : (
                  <span className="block text-xs">({achievements.bugsRemovedCount}/5)</span>
                )}
              </div>
              <div
                className={`rounded-xl border-2 px-3 py-2 text-center text-xs sm:text-sm ${
                  achievements.weedsTrimmed3Unlocked
                    ? "border-amber-400 bg-amber-100 text-amber-900"
                    : "border-gray-200 bg-white/60 text-gray-500"
                }`}
                title="剪雜草 3 次"
              >
                <span className="font-semibold">✂️ 剪雜草 3 次</span>
                {achievements.weedsTrimmed3Unlocked ? (
                  <span className="ml-1">✓</span>
                ) : (
                  <span className="block text-xs">({achievements.weedsTrimmedCount}/3)</span>
                )}
              </div>
              <div
                className={`rounded-xl border-2 px-3 py-2 text-center text-xs sm:text-sm ${
                  achievements.planted3Unlocked
                    ? "border-amber-400 bg-amber-100 text-amber-900"
                    : "border-gray-200 bg-white/60 text-gray-500"
                }`}
                title="小園丁：種過 3 種不同植物"
              >
                <span className="font-semibold">🌱 小園丁</span>
                {achievements.planted3Unlocked ? (
                  <span className="ml-1">✓</span>
                ) : (
                  <span className="block text-xs">(種過 {achievements.plantedSeedCount}/3 種)</span>
                )}
              </div>
              <div
                className={`rounded-xl border-2 px-3 py-2 text-center text-xs sm:text-sm ${
                  achievements.planted6Unlocked
                    ? "border-amber-400 bg-amber-100 text-amber-900"
                    : "border-gray-200 bg-white/60 text-gray-500"
                }`}
                title="植物收藏家：種過 6 種不同植物"
              >
                <span className="font-semibold">🌿 植物收藏家</span>
                {achievements.planted6Unlocked ? (
                  <span className="ml-1">✓</span>
                ) : (
                  <span className="block text-xs">(種過 {achievements.plantedSeedCount}/6 種)</span>
                )}
              </div>
              <div
                className={`rounded-xl border-2 px-3 py-2 text-center text-xs sm:text-sm ${
                  achievements.harvest3Unlocked
                    ? "border-amber-400 bg-amber-100 text-amber-900"
                    : "border-gray-200 bg-white/60 text-gray-500"
                }`}
                title="豐收：收成 3 次"
              >
                <span className="font-semibold">🌾 豐收</span>
                {achievements.harvest3Unlocked ? (
                  <span className="ml-1">✓</span>
                ) : (
                  <span className="block text-xs">({achievements.harvestCount}/3 次)</span>
                )}
              </div>
              <div
                className={`rounded-xl border-2 px-3 py-2 text-center text-xs sm:text-sm ${
                  achievements.harvest10Unlocked
                    ? "border-amber-400 bg-amber-100 text-amber-900"
                    : "border-gray-200 bg-white/60 text-gray-500"
                }`}
                title="熟練園丁：收成 10 次"
              >
                <span className="font-semibold">👨‍🌾 熟練園丁</span>
                {achievements.harvest10Unlocked ? (
                  <span className="ml-1">✓</span>
                ) : (
                  <span className="block text-xs">({achievements.harvestCount}/10 次)</span>
                )}
              </div>
              <div
                className={`rounded-xl border-2 px-3 py-2 text-center text-xs sm:text-sm ${
                  achievements.todayStreak3Unlocked
                    ? "border-amber-400 bg-amber-100 text-amber-900"
                    : "border-gray-200 bg-white/60 text-gray-500"
                }`}
                title="今日任務連續 3 天"
              >
                <span className="font-semibold">📋 今日任務連續 3 天</span>
                {achievements.todayStreak3Unlocked ? (
                  <span className="ml-1">✓</span>
                ) : (
                  <span className="block text-xs">(連續 {achievements.todayStreak}/3 天)</span>
                )}
              </div>
              <div
                className={`rounded-xl border-2 px-3 py-2 text-center text-xs sm:text-sm ${
                  achievements.todayStreak7Unlocked
                    ? "border-amber-400 bg-amber-100 text-amber-900"
                    : "border-gray-200 bg-white/60 text-gray-500"
                }`}
                title="今日任務連續 7 天"
              >
                <span className="font-semibold">📋 今日任務連續 7 天</span>
                {achievements.todayStreak7Unlocked ? (
                  <span className="ml-1">✓</span>
                ) : (
                  <span className="block text-xs">(連續 {achievements.todayStreak}/7 天)</span>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-amber-800">解鎖成就可獲得 2～5 代幣</p>
          </div>
        )}
        {/* 變更植物：選單 + 確認視窗 */}
        {showChangePlantModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-plant-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowChangePlantModal(false);
                setChangePlantSelectedSeedId(null);
                setChangePlantConfirming(false);
              }
            }}
          >
            <div className="w-full max-w-sm rounded-3xl border-2 border-amber-200 bg-white p-6 shadow-xl">
              <h2 id="change-plant-title" className="mb-4 text-center text-lg font-bold text-[var(--foreground)]">
                🔄 變更植物
              </h2>
              {!changePlantSelectedSeedId ? (
                <>
                  <p className="mb-3 text-center text-sm text-gray-600">選擇要改種的種子（目前植物將消失，無法復原）</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {SEED_IDS.filter((id) => ((inventory?.seeds ?? {})[id] ?? 0) >= 1).map((seedId) => (
                      <button
                        key={seedId}
                        type="button"
                        onClick={() => setChangePlantSelectedSeedId(seedId)}
                        className="flex flex-col items-center gap-1 rounded-2xl border-2 border-green-200 bg-green-50/80 p-3 transition hover:border-green-400 hover:bg-green-100"
                      >
                        <div className="relative h-12 w-12">
                          <Image
                            src={getSeedGrowthImagePath(seedId, 0)}
                            alt=""
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        <span className="text-sm font-bold text-[var(--foreground)]">{SEED_NAMES[seedId] ?? seedId}</span>
                        <span className="text-xs text-gray-500">× {(inventory?.seeds ?? {})[seedId] ?? 0}</span>
                      </button>
                    ))}
                  </div>
                  {SEED_IDS.every((id) => ((inventory?.seeds ?? {})[id] ?? 0) < 1) && (
                    <p className="mt-3 text-center text-sm text-amber-700">背包沒有其他種子，請先到商店購買</p>
                  )}
                </>
              ) : (
                <>
                  <p className="mb-4 text-center text-sm text-gray-700">
                    確定要改種嗎？<strong>目前的植物會消失，無法復原。</strong>
                    <br />
                    將改種為：<span className="font-bold text-green-700">{SEED_NAMES[changePlantSelectedSeedId] ?? changePlantSelectedSeedId}</span>
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setChangePlantConfirming(true);
                        void handleChangePlantConfirm();
                      }}
                      disabled={changePlantConfirming}
                      className="min-h-[44px] rounded-2xl bg-[var(--primary)] px-6 font-bold text-white shadow-md hover:bg-[var(--primary-hover)] disabled:opacity-60"
                    >
                      {changePlantConfirming ? "處理中…" : "確定"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChangePlantSelectedSeedId(null);
                      }}
                      disabled={changePlantConfirming}
                      className="min-h-[44px] rounded-2xl border-2 border-gray-300 px-6 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      返回
                    </button>
                  </div>
                </>
              )}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePlantModal(false);
                    setChangePlantSelectedSeedId(null);
                    setChangePlantConfirming(false);
                  }}
                  className="text-sm font-medium text-gray-500 underline hover:text-gray-700"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
