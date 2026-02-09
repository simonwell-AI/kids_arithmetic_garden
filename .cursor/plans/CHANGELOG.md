# Changelog

本專案（Kids Arithmetic Garden｜兒童算術花園）所有重要變更都會記錄於此。  
格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)。

---

## [Unreleased]

### Added
- **成就徽章**：我的花園頁新增「成就徽章」區塊，四項成就解鎖各得 2 代幣  
  - 🌸 第一次開花（收成開花株）  
  - 📅 連續 7 天進花園  
  - 🐛 除蟲 5 次（噴殺蟲劑）  
  - ✂️ 剪雜草 3 次  
- **開花／收成慶祝**：植物剛開花或收成時播放慶祝音效（celebration.mp3）並顯示彩帶粒子動畫  
- **開花收成代幣**：開花後收成發放 8 代幣，畫面上顯示「獲得 X 代幣！收成完成，可以再種新種子～」  
- **今日任務送肥料**：完成今日任務（20 題）除代幣外，額外獲得一般肥料 ×1，完成畫面顯示「以及一般肥料 ×1」  
- **IndexedDB 成就 store**：`achievements` store（DB 版本 4），記錄解鎖狀態與進度  

### Changed
- **首頁介紹區塊**：預設只顯示標題「Kids Arithmetic Garden｜兒童算術花園」，旁有三角形（▶／▼）開關可展開／收合完整介紹  
- **每日任務完成獎勵**：由 6 代幣改為 10 代幣  
- **乘法速度測驗獎勵**：由 3 代幣改為 2 代幣（成功率 80% 門檻不變）  
- **雜草重生規則**：改為「剪完或造訪後超過 12 小時」才再長雜草（原為 1 天）  

### Fixed
- **首頁手機排版**：代幣、商店、我的花園改為 `grid grid-cols-3` 均分寬度，修正 iPhone XR 等窄螢幕上排版錯位  
- **雜草邏輯**：`getHasWeeds()` 改為依上次造訪／剪草時間計算，不再固定回傳 `true`，剪完後不會立即再顯示雜草  
- **Render 部署小圖**：kids_arithmetic_garden 新增 `app/favicon.ico`，讓部署站正確顯示網站圖示  

### Removed
- **徒手抓蟲**：移除「徒手抓蟲（冷卻 2 小時）」功能，除蟲僅保留「噴殺蟲劑」  

---

## [0.1.0] - 2026-02

### Added
- **首頁**：Kids Arithmetic Garden 描述區塊、🏪 商店／🌱 我的花園／📋 今日任務 入口、練習題／九九乘法連結、匯出／匯入 JSON、footer 版權 © 2026 張賽門  
- **練習題**：自訂練習、綜合題速度測驗（80% 給 6 代幣）、加法／減法／乘法／除法速度測驗（80% 各給 1／2／3／3 代幣），60 秒 10 題  
- **花園**：種植、澆水、施肥、鬆土、噴霧、換盆、營養土、剪雜草、蟲害與噴殺蟲劑、收成；造訪時記錄 `garden_last_visit`，離開時更新  
- **蟲害**：進入花園時幼苗以上 15% 機率觸發蟲害，成長速率 ×0.6；噴殺蟲劑消耗 1 瓶除蟲  
- **商店**：代幣購買種子、水、一般／高級肥料、殺蟲劑、擴充背包、園藝工具、水壺與背包外觀；開發環境測試 +100 代幣按鈕  
- **今日任務**：每日 20 題，完成可領代幣與連續 7 天加成；今日任務頁完成後慶祝音效與粒子  
- **九九乘法表**：完整 2～9 乘法表與語音朗讀  
- **Favicon / 圖示**：`public/favicon_io/`、layout metadata.icons、manifest  
- **音效**：澆水、噴霧、鬆土、剪刀、慶祝等音效與解鎖邏輯  

### Changed
- 花園蟲害移除「測試蟲害」開關，改為依 `hasBugs` 與機率判定  
- 速度測驗開始改為非同步出題，避免乘法／除法題目產生卡住  

### Fixed
- 花園蟲害 `useCallback` 依賴補齊，避免閉包使用舊狀態  

---

## 說明

- **cursor-ai-jamie-related**：開發與規格用專案（含本 CHANGELOG）。  
- **kids_arithmetic_garden**：部署用專案，功能與本專案同步，CHANGELOG 以本檔案為準。  

[Unreleased]: https://github.com/simonwell-AI/cursor-ai-jamie-related/compare/v0.1.0...HEAD  
[0.1.0]: https://github.com/simonwell-AI/cursor-ai-jamie-related/releases/tag/v0.1.0  
