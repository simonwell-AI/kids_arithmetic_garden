# 慶祝／過關用可愛素材（可選）

目前 App 已內建 **純 CSS 慶祝特效**（答對彈跳、今日任務完成飄落星星、徽章光暈）。若想換成更可愛的圖片或音效，可從以下免費來源下載後放入此資料夾，並在程式中引用。

---

## 彩帶／彩紙（Confetti）

| 來源 | 說明 | 授權 | 連結 |
|------|------|------|------|
| **OpenGameArt** | 搜尋 "confetti" 或 "particle" | 多種授權，選 CC0 可商用 | https://opengameart.org/content/confetti |
| **Kenney** | 2D 粒子／效果圖（免費） | CC0 | https://kenney.nl/assets/particle-pack-2 |
| **itch.io** | 搜尋 "confetti free" | 依作者標示 | https://itch.io/game-assets/free/tag-confetti |

本專案已使用 `confetti.png`（彩帶圖）與 `star-medal.png`（星星獎章）。若替換檔案請保持檔名一致，或於程式中更新路徑。

---

## 星星／獎章圖示

| 來源 | 說明 | 授權 | 連結 |
|------|------|------|------|
| **Flaticon** | 搜尋 "star badge"、"medal" | 免費需標註／付費免標註 | https://www.flaticon.com/search?word=star%20badge |
| **Icons8** | 星星、獎盃、徽章 | 免費可商用（需連結或付費免連結） | https://icons8.com/icons/set/star |
| **SVG Repo** | 免費 SVG 星星、獎章 | 多為 CC0 或 Public Domain | https://www.svgrepo.com/search?q=star |

本專案已使用 `star-medal.png` 作為今日任務完成與 7 天徽章圖示。可替換此檔以更換樣式。

---

## 慶祝音效（過關／任務完成）

| 來源 | 說明 | 授權 | 連結 |
|------|------|------|------|
| **Freesound** | "level complete"、"achievement"、"success" | CC0 可商用 | https://freesound.org/search/?q=level+complete |
| **Mixkit** | "Game success"、"Win" | Mixkit License | https://mixkit.co/free-sound-effects/win/ |
| **Pixabay** | 搜尋 "celebration"、"achievement" | 免費可商用 | https://pixabay.com/sound-effects/search/celebration/ |

本專案已使用 `public/sounds/celebration.mp3`，今日任務完成彈出時會自動播放。

---

## 使用方式（開發者）

- **圖片**：放到 `public/celebration-assets/`，在元件內用 `/celebration-assets/檔名.png` 引用。
- **音效**：放到 `public/sounds/`，在今日任務完成或 7 天達成時呼叫播放邏輯即可。

未放置檔案不影響現有功能，內建 CSS 特效仍會正常顯示。
