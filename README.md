# 兒童算術練習 (Kid Arithmetic)

兒童友善的算術練習 Web App：加減乘除練習、九九乘法表閃卡與速度測驗，搭配自適應出題與本地儲存（無需登入）。

## 功能

- **練習題 (Drill)**：選擇運算（+ − × ÷）、範圍（0–10 / 0–20 / 0–100）、題數（10 / 20 / 不限）、難度（簡單 / 普通 / 困難）；一題一屏、自訂數字鍵盤、即時對錯與反應時間；結束後顯示正確率與平均時間，可「再練錯題」。
- **九九乘法 (Times Table)**：閃卡（點擊翻面，1–9 × 1–9）、60 秒速度測驗。
- **自適應**：依弱項權重出題（約 80% 高權重、20% 低權重），答錯 +3、慢對 +1、快對 −1（下限 0）。
- **今日任務**：每天完成 20 題即達成今日任務、獲得今日徽章；連續 7 天完成可獲得 7 天連續徽章；首頁顯示進度與連續天數。**練習題、九九乘法速度測驗、今日題組**皆會計入。
- **代幣、商店與花園**：完成今日任務可獲得代幣；商店可購買種子、水、肥料與背包；在花園中種植、澆水、施肥並等待開花，支援收成後重新種植。
- **本地儲存**：sessions、attempts、skill 權重、dailyProgress 存於 IndexedDB；可匯出 / 匯入 JSON（匯入為覆寫）。
- **答對／答錯音效**：可選，將音效檔放入 `public/sounds/` 即可，詳見下方「音效」說明。
- **過關慶祝特效**：答對時卡片彈跳＋文字閃爍；今日任務完成時飄落星星＋徽章光暈；首頁完成狀態有星星閃爍。若想改用更可愛的彩帶／星星圖或慶祝音效，可參考 `public/celebration-assets/README.md` 的免費下載來源。

## 音效（可選）

答對與答錯時會嘗試播放音效。請將兩個檔案放入 **`public/sounds/`** 並命名為：

- `correct.mp3`（答對）
- `wrong.mp3`（答錯）

**免費下載來源**（可商用／教育使用）：

| 類型 | 推薦來源 | 連結 |
|------|----------|------|
| 答對 | Freesound（CC0）"Correct Answer" | https://freesound.org/people/Beetlemuse/sounds/528957/ |
| 答對 | Mixkit "Correct answer tone" | https://mixkit.co/free-sound-effects/correct/ |
| 答錯 | Mixkit "Wrong answer fail notification" | https://mixkit.co/free-sound-effects/wrong/ |
| 答錯 | Pixabay 搜尋 "wrong answer" | https://pixabay.com/sound-effects/search/wrong%20answer/ |

更多選項與授權說明見 `public/sounds/README.md`。未放置檔案時不會報錯，僅不播放聲音。

## 環境需求

- Node.js 18+

## 安裝與執行

```bash
npm install
npm run dev
```

開啟 [http://localhost:3001](http://localhost:3001)。

## 公開使用（Cloudflare Tunnel）

若要讓外網存取（例如分享給家人或學生），可使用 **Cloudflare Tunnel**，無需開放路由器埠或固定 IP。

- **快速試用**：安裝 [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) 後，先執行 `npm run build && npm run start`，再執行：
  ```bash
  cloudflared tunnel --url http://localhost:3001
  ```
  終端會顯示一個 `https://xxxx.trycloudflare.com` 網址，即可從外網開啟。

- **自訂網域**：使用命名隧道與 Cloudflare 代管網域，可取得固定網址。完整步驟見 [cloudflare/README.md](cloudflare/README.md)。

## 測試

```bash
npm test
```

涵蓋題目生成器（加減乘除規則、範圍、難度、無負數、整數除）與自適應引擎（權重增減、抽樣比例）。

## 今日題組

- 首頁可進入「今日任務」專屬題組（固定題數、當天同一組題），完成即計入今日任務進度。

## 匯出 / 匯入

- **匯出**：首頁點「匯出資料 (JSON)」下載目前 sessions、attempts、skillWeights、dailyProgress。
- **匯入**：首頁點「匯入資料 (覆寫)」選擇先前匯出的 JSON 檔案，會覆寫目前 IndexedDB 內容（含今日任務與連續天數）後重新載入頁面。

## 技術棧

- Next.js (App Router) + TypeScript
- Tailwind CSS
- IndexedDB（透過 [idb](https://www.npmjs.com/package/idb)）
- Jest（generator、adaptive 單元測試）
