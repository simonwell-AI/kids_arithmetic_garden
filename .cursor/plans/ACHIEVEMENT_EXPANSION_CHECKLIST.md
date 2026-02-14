# 成就徽章擴充實作清單

依實作難度與依賴順序排列，可分批實作。

---

## 階段一：用現有資料即可（無新計數器）

### 1. 小園丁：種過 3 種不同植物

| 項目 | 說明 |
|------|------|
| **條件** | `plantedSeedIds.length >= 3` |
| **代幣** | 2（或自訂） |
| **db.ts** | `AchievementRecord` 新增：`planted3Unlocked?: boolean`、`planted3UnlockedAt?: number` |
| **achievements.ts** | 預設值、`AchievementState`、`getAchievements` 回傳；在 **`addPlantedSeedId`** 內：若 `r.plantedSeedIds.length >= 3 && !r.planted3Unlocked` 則解鎖、寫入時間、`addCoins`、`saveAchievements`；可新增 `unlockPlanted3IfEligible()` 或直接在 addPlantedSeedId 裡處理 |
| **app/garden/page.tsx** | 成就區塊加一卡：「🌱 小園丁」、`achievements.planted3Unlocked`、未解鎖顯示 `(種過 X/3 種)`（X = `plantedSeedIds.length`）；解鎖當下若要 toast 需在 `handlePlant` 成功後檢查並 showMessage |
| **備註** | `addPlantedSeedId` 已在 `garden.ts` 的 `plantSeed()` 成功後呼叫（約第 185 行），解鎖邏輯寫在 `addPlantedSeedId` 內即可。若要「解鎖當下」在花園頁 showMessage，需讓 addPlantedSeedId 回傳 `{ planted3JustUnlocked?, planted6JustUnlocked?, coinsAwarded? }`，並在 handlePlant 成功後根據回傳顯示訊息。 |

---

### 2. 植物收藏家：種過 6 種不同植物

| 項目 | 說明 |
|------|------|
| **條件** | `plantedSeedIds.length >= 6`（與現有種子種類數一致即可） |
| **代幣** | 建議 5 或 10（進階成就） |
| **db.ts** | `AchievementRecord` 新增：`planted6Unlocked?: boolean`、`planted6UnlockedAt?: number` |
| **achievements.ts** | 同上，在 `addPlantedSeedId` 內加判 `length >= 6`、解鎖、發幣 |
| **app/garden/page.tsx** | 成就區塊加一卡：「🌿 植物收藏家」、進度 `(X/6 種)` |
| **備註** | 若未來種子種類數變動，可改為 `>= SEED_IDS.length` 或常數 |

---

## 階段二：新增「收成次數」計數器

### 3. 豐收：收成 3 次

| 項目 | 說明 |
|------|------|
| **條件** | 收成成功次數 >= 3（僅限「有開花」的收成，或全部收成皆可，需統一規則） |
| **代幣** | 2 |
| **db.ts** | `AchievementRecord` 新增：`harvestCount: number`（預設 0）、`harvest3Unlocked?: boolean`、`harvest3UnlockedAt?: number` |
| **achievements.ts** | 預設值、state、getAchievements；新增 `incrementHarvestCount()`：`harvestCount += 1`，若 `>= 3 && !harvest3Unlocked` 則解鎖、發幣、save |
| **呼叫時機** | `src/persistence/garden.ts` 的 `harvest()` 在「有發放代幣」時（即已開花收成）呼叫 `incrementHarvestCount()`；若希望未開花收成也計數，則在 harvest 成功時就呼叫（需從 garden 依賴 achievements 或由 app 層在 handleHarvest 成功後呼叫） |
| **app/garden/page.tsx** | 成就區塊加一卡：「🌾 豐收」、進度 `(X/3 次)`；handleHarvest 內若由 app 負責呼叫則在 harvest 成功且 result.coinsAwarded != null 時呼叫 `incrementHarvestCount()` |

**建議**：在 `garden.ts` 的 `harvest()` 成功且 `coinsAwarded != null` 時不直接依賴 achievements，改由 `app/garden/page.tsx` 的 `handleHarvest` 在 `harvest()` 成功後呼叫 `incrementHarvestCount()`，避免 persistence 層互相依賴。

---

### 4. 熟練園丁：收成 10 次

| 項目 | 說明 |
|------|------|
| **條件** | `harvestCount >= 10` |
| **代幣** | 建議 5 |
| **db.ts** | `harvest10Unlocked?: boolean`、`harvest10UnlockedAt?: number` |
| **achievements.ts** | 在 `incrementHarvestCount()` 內加判 `>= 10` 解鎖 |
| **app/garden/page.tsx** | 成就區塊加一卡：「👨‍🌾 熟練園丁」、進度 `(X/10 次)` |

---

## 階段三：今日任務連續天數（需讀取 dailyProgress）

### 5. 今日任務連續 3 天

| 項目 | 說明 |
|------|------|
| **條件** | 今日任務完成且當日領獎時，`getStreak()` >= 3（來自 `dailyProgress.getStreak()`） |
| **代幣** | 2 |
| **db.ts** | `AchievementRecord` 新增：`todayStreak3Unlocked?: boolean`、`todayStreak3UnlockedAt?: number` |
| **achievements.ts** | 依賴 `getStreak` from `./dailyProgress`；新增 `checkTodayStreakAchievements(streak: number)`：若 `streak >= 3 && !r.todayStreak3Unlocked` 解鎖並發幣；**呼叫時機**：在「今日任務完成並領獎」時呼叫，即 `dailyReward.ts` 的 `advanceDailyProgressAndClaimReward` 在 `meetsThreshold` 且 `claimDailyRewardIfEligible()` 後，取得 streak（可從 dailyProgress.getStreak()）再呼叫 `checkTodayStreakAchievements(streak)` |
| **app/today/page.tsx** | 不需改成就 UI（成就區在花園頁）；若要在今日任務頁也顯示「解鎖成就」訊息，可在領獎結果中帶出 justUnlocked 與 coinsAwarded（需 dailyReward 與 achievements 協調回傳） |
| **app/garden/page.tsx** | 成就區塊加兩卡：「📋 今日任務連續 3 天」、「📋 今日任務連續 7 天」、進度可顯示為「(連續 X 天)」（X 需從某處取得，例如 achievements 存 lastTodayStreak 或今日任務頁傳回） |

**注意**：`getStreak()` 在 `dailyProgress.ts`，是「今日任務」的連續完成天數；成就解鎖應在「當日完成今日任務且領獎」時檢查，避免重複發幣（同一天只領一次獎，成就也只在該次檢查一次）。

---

### 6. 今日任務連續 7 天

| 項目 | 說明 |
|------|------|
| **條件** | 領獎時 `getStreak() >= 7` |
| **代幣** | 建議 5 |
| **db.ts** | `todayStreak7Unlocked?: boolean`、`todayStreak7UnlockedAt?: number` |
| **achievements.ts** | 在 `checkTodayStreakAchievements(streak)` 內加判 `streak >= 7` |
| **app/garden/page.tsx** | 同上，成就卡「今日任務連續 7 天」 |

**實作細節**：`advanceDailyProgressAndClaimReward` 在 `progress.justCompleted && meetsThreshold` 時已呼叫 `claimDailyRewardIfEligible()` 和 `addFertilizerBasic(1)`，可在該分支內加上：`const streak = await getStreak(); await checkTodayStreakAchievements(streak);`，並讓 `checkTodayStreakAchievements` 回傳 `{ todayStreak3JustUnlocked, todayStreak7JustUnlocked, coinsAwarded }` 以便今日任務頁顯示「解鎖成就 +N 代幣」（可選）。

---

## 檔案修改總覽

| 檔案 | 修改內容 |
|------|----------|
| **src/persistence/db.ts** | `AchievementRecord` 新增欄位（見上各項） |
| **src/persistence/achievements.ts** | 預設值、AchievementState、getAchievements、addPlantedSeedId 解鎖邏輯、incrementHarvestCount、checkTodayStreakAchievements |
| **src/persistence/dailyReward.ts** | 在領獎分支呼叫 getStreak + checkTodayStreakAchievements（階段三） |
| **app/garden/page.tsx** | 成就區 2x2 改為 2x3 或 3x2，新增各成就卡；handleHarvest 成功後呼叫 incrementHarvestCount（階段二）；handlePlant 成功後若需解鎖 toasts 可檢查成就 |
| **src/persistence/garden.ts** | 可選：harvest() 不回傳是否為開花收成，由呼叫端依 result.coinsAwarded != null 判斷並呼叫 incrementHarvestCount |

---

## 建議實作順序

1. **小園丁**（種過 3 種）— 僅改 db、achievements、addPlantedSeedId、garden 頁成就卡與進度。
2. **植物收藏家**（種過 6 種）— 同上，一併加欄位與判斷。
3. **豐收**（收成 3 次）— 新增 harvestCount 與 incrementHarvestCount，handleHarvest 呼叫，成就卡。
4. **熟練園丁**（收成 10 次）— 同 3，在 incrementHarvestCount 內多一個門檻。
5. **今日任務連續 3 天 / 7 天**— dailyReward 領獎時 getStreak + checkTodayStreakAchievements，成就卡兩張。

---

## 成就解鎖代幣建議

| 成就 | 建議代幣 |
|------|----------|
| 小園丁、豐收、今日任務連續 3 天 | 2（與現有一致） |
| 植物收藏家、熟練園丁、今日任務連續 7 天 | 5（進階） |

若希望全部統一為 2，可將上述 5 改為 2。
