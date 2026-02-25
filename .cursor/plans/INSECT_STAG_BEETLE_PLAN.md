# 養昆蟲／鍬形蟲 — 實作計畫

與花園養植物對齊：一個飼養箱、一隻蟲、餵食成長、成蟲後結算代幣。第一版以 **鍬形蟲** 為單一物種。

---

## 1. 玩法與規則（第一版）

| 項目 | 說明 |
|------|------|
| **飼養單位** | 一個 **飼養箱**，同時只養 **一隻** 鍬形蟲（與花園「一塊地一株植物」同構）。 |
| **取得蟲** | 商店購買「鍬形蟲幼蟲」或「蟲卵」後，在蟲屋頁選擇「開始飼養」（消耗 1 隻，建立飼養記錄）。 |
| **照顧** | **餵食**：消耗 1 個飼料（腐植土／果凍），增加成長值並更新上次餵食時間。可選冷卻（如每日／每數小時可餵 N 次）。 |
| **成長** | 依 **時間** ＋ **餵食次數** 累積成長值，換算成階段（幼蟲 → 蛹 → 成蟲）。 |
| **結算** | 達到 **成蟲** 階段後，可「羽化完成」或「放生」：發放代幣、清空該筆飼養記錄，可再養下一隻。 |
| **無蟲時** | 若尚未飼養或已放生：顯示空飼養箱，引導至商店購買幼蟲／蟲卵後開始飼養。 |

---

## 2. 食物與工具

| 類型 | 名稱（建議） | 用途 | 取得 |
|------|--------------|------|------|
| **消耗品** | 腐植土／發酵木屑 | 幼蟲階段餵食，每次餵食扣 1、增加成長值 | 商店購買 |
| **消耗品** | 昆蟲果凍 | 成蟲階段餵食（或第一版與腐植土共用一種「昆蟲飼料」） | 商店購買 |
| **設施** | 鍬形蟲飼養箱 | 商店**買一次**即永久擁有，持有才能飼養。 | 商店購買一次 |
| **消耗品** | 除蟎劑 | 蟲屋出現蟎時使用，消耗 1、清除蟎狀態 | 商店購買 |

**第一版簡化**：僅一種 **「昆蟲飼料」**，幼蟲與成蟲皆用此餵食，每次餵食扣 1、加成長值。

### 2.1 天敵：蟎

| 項目 | 說明 |
|------|------|
| **觸發** | 進入蟲屋時（有飼養中且為幼蟲／蛹階段）依機率判定是否出現蟎，與花園蟲害類似。 |
| **效果** | 有蟎時：成長速率降低（例如 ×0.6）或停滯，直到清除。 |
| **顯示** | 蟲屋頁顯示「有蟎」狀態或蟎的視覺提示，引導使用除蟎劑。 |
| **解法** | 使用 **除蟎劑**（消耗 1 個）：清除 `hasMites`，可設冷卻時間內不再觸發。 |
| **記錄** | `InsectRecord` 新增 `hasMites?: boolean`、`lastMiteRemovedAt?: number`（可選，用於冷卻）。 |

---

## 3. 成長階段（鍬形蟲）

階段編號 **從 1 到 5**，對應圖檔 `stag_beetle_1.png`～`stag_beetle_5.png`。

| 階段 | 說明 | 對應圖檔 |
|------|------|----------|
| 1 | 幼蟲 | `stag_beetle_1.png` |
| 2 | 成長中 | `stag_beetle_2.png` |
| 3 | 成長中 | `stag_beetle_3.png` |
| 4 | 蛹／前成蟲 | `stag_beetle_4.png` |
| 5 | 成蟲 | `stag_beetle_5.png` |

**成長計算**：`growthValue` 依餵食與時間累積，`stage = growthValueToStage(growthValue)` 回傳 1～5，對應上述圖檔；成蟲為階段 5，可放生結算。

---

## 4. 代幣與結算

| 項目 | 說明 |
|------|------|
| **時機** | 僅在 **成蟲階段** 且玩家點選「放生」或「羽化完成」時結算。 |
| **發放** | 依設計發放固定代幣（如 15～25），或依該蟲「餵食次數／照顧天數」小幅加給。 |
| **實作** | 呼叫 `addCoins(amount)`，清空飼養記錄，回到「空飼養箱」狀態，可再養下一隻。 |

---

## 5. 技術要點

| 項目 | 說明 |
|------|------|
| **DB** | 新增 store：`STORE_INSECT`（或 `insect_home`），一筆記錄：`InsectRecord`。 |
| **InsectRecord** | 至少：`id`、`insectId: "stag_beetle"`、`growthValue`、`plantedAt`、`lastFedAt`；天敵蟎：`hasMites?: boolean`、`lastMiteRemovedAt?: number`（可選）。 |
| **背包** | 新增：`insectFood`、`miteSpray`（除蟎劑）數量；飼養箱為買一次永久擁有（如 `hasInsectHabitat: boolean` 或 `insectHabitats`）。 |
| **商店** | 新增商品：昆蟲飼料、鍬形蟲幼蟲、飼養箱（買一次永久）、除蟎劑。 |
| **路由** | 新頁面：`app/insect/page.tsx`（或 `app/creature/page.tsx`）。 |
| **成長計算** | 與花園類似：`growthValue += f(時間差, 餵食次數)`，再 `stage = growthValueToStage(growthValue)`，stage 為 1～5。 |

### 5.1 動畫與音效（比照花園）

| 項目 | 說明 |
|------|------|
| **原則** | 與花園一致：操作時先 `unlockAudio()`（使用者手勢解鎖），再播放對應音效；按鈕觸發後設 `animating` 狀態，播完動畫與音效後再 `setAnimating(null)` 並重新載入資料。 |
| **餵食** | 觸發「餵食」動畫（例如飼料落下／蟲進食），音效可沿用 `playSoilSound()` 或 `playSparkleSound()`（`@/src/lib/sound`）；動畫期間按鈕 disabled。 |
| **除蟎** | 觸發「噴霧」動畫，音效沿用 `playSpraySound()`，與花園噴殺蟲劑／驅蜂同套；動畫結束後清除 `hasMites`、重新載入。 |
| **放生** | 成蟲放生時可播 `playCelebrationSound()`，與花園收成開花一致。 |
| **實作** | 蟲屋頁維護 `animating` 狀態（如 `"feed"`、`"spray"`、`null`），各動作先 `setAnimating(...)`、播音效、設 `setTimeout` 在音效／動畫結束後 `setAnimating(null)` 並 `load()`。 |

---

## 6. 實作步驟清單

1. **DB 與型別**  
   - `db.ts`：`DB_VERSION` +1，新增 `STORE_INSECT`、`INSECT_KEY`、`InsectRecord` 介面。  

2. **背包與商店**  
   - `InventoryRecord`：新增 `insectFood?: number`（或 `insectFoods`）。  
   - `inventory.ts`：`addInsectFood`、`useInsectFood`（或依 key 增減）。  
   - `catalog.ts`：新增類型 `insect_food`、`insect_larva`（或 `insect_stag_beetle`）、可選 `insect_habitat`；對應商品與價格。  
   - `purchase.ts`：處理購買飼料、幼蟲、飼養箱（若買）並寫入背包。  

3. **蟲屋 persistence**  
   - `insect.ts`（新建）：`getInsect()`、`startInsect(insectId)`（消耗 1 幼蟲、建立記錄）、`feedInsect()`（扣飼料、加成長）、`releaseInsect()`（成蟲時發代幣、刪記錄）。  
   - 成長公式：例如 `growthValue += 0.2` 每次餵食，或依 `lastFedAt` 與時間差計算自然成長。  

4. **蟲屋頁**  
   - `app/insect/page.tsx`：顯示飼養箱、當前蟲階段圖（stage 1～5 對應 `stag_beetle_1.png`～`stag_beetle_5.png`）、餵食按鈕（有飼料且冷卻內）、成蟲（階段 5）時「放生」按鈕；無蟲時顯示「尚未飼養」與商店入口。有蟎時顯示狀態與「使用除蟎劑」按鈕。  
   - **動畫與音效**：餵食／除蟎／放生比照花園（§5.1）— `animating` 狀態、`unlockAudio`、對應 `play*Sound`、動畫結束後 `load()`。  

4.1 **蟎與除蟎**  
   - 進入蟲屋時依機率設定 `hasMites`（幼蟲／蛹階段）；成長計算時若 `hasMites` 則成長率 ×0.6 或 0。  
   - `removeMites()`（或 `useMiteSpray()`）：消耗 1 除蟎劑，清除 `hasMites`，寫入 `lastMiteRemovedAt`。  

5. **圖檔**  
   - 鍬形蟲階段 **1～5**：`stag_beetle_1.png`～`stag_beetle_5.png`；飼養箱空：`habitat_empty.png`；飼料：`insect_food.png`；幼蟲商品：`stag_beetle_1.png`。  
   - 除蟎劑：`mite_spray.png`；蟎狀態提示：`mites.png`。  

6. **首頁入口**  
   - `app/page.tsx`：新增「🪲 養昆蟲」或「蟲屋」連結至 `/insect`。  

---

## 7. 檔案與依賴

| 檔案 | 說明 |
|------|------|
| `src/persistence/db.ts` | 新增 `STORE_INSECT`、`InsectRecord`、`INSECT_KEY`。 |
| `src/persistence/insect.ts` | 新建：取得／開始／餵食／放生鍬形蟲邏輯。 |
| `src/persistence/inventory.ts` | 昆蟲飼料、幼蟲數量之增減與查詢。 |
| `src/shop/catalog.ts` | 昆蟲飼料、鍬形蟲幼蟲、飼養箱（買一次永久）、除蟎劑。 |
| `src/shop/purchase.ts` | 購買後寫入對應背包欄位。 |
| `app/insect/page.tsx` | 蟲屋頁：飼養箱 UI、餵食、放生、空狀態；動畫與音效比照花園（§5.1）。 |
| `app/page.tsx` | 首頁加蟲屋入口。 |
| `public/insert-assets/`（或 `insect-assets/`） | 鍬形蟲階段 1～5、飼養箱、飼料、除蟎劑、蟎提示圖。 |

---

## 8. 與花園的對齊摘要

| 花園 | 蟲屋（鍬形蟲） |
|------|----------------|
| `GardenRecord`、`getGarden()` | `InsectRecord`、`getInsect()` |
| 種子種下 `plantSeed(seedId)` | 開始飼養 `startInsect(insectId)`（消耗幼蟲） |
| 澆水／施肥 `water()`、`fertilize()` | 餵食 `feedInsect()`（消耗飼料） |
| `growthValue`、`growthStage` | 同構，階段 **1～5**（對應 `stag_beetle_1.png`～`stag_beetle_5.png`） |
| 收成 `harvest()` | 放生 `releaseInsect()`（成蟲、發代幣） |
| 蟲害／蜜蜂、殺蟲劑 | 蟎、除蟎劑 |
| 商店種子、水、肥料 | 商店飼料、幼蟲、飼養箱、除蟎劑 |

---

## 9. 後續擴充（不做入第一版）

- 多種昆蟲（瓢蟲、獨角仙）：不同 `insectId`、不同階段數與圖。
- 成蟲階段再細分（羽化中／完成）或多種飼料（幼蟲用木屑、成蟲用果凍）。
- 清潔／換底材（夾子、小鏟）：扣道具、影響成長或健康值；圖檔可沿用 `insect_clips.png`、`insect_shovel.png`。
- 其他天敵（黴菌、小蟲騷擾）：可選。
- 蟲屋成就或圖鑑：養過 N 種、放生 M 隻得代幣。
- 與花園連動：例如「花園開花時蟲屋成長加速」等彩蛋。

以上為養昆蟲／鍬形蟲計畫文檔；實作依此執行。
