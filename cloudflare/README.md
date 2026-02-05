# Cloudflare Tunnel 設定

本專案可透過 [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) 在公開網路上提供服務，無需開放本機埠或固定 IP。

## 方式一：快速隧道（免登入，適合試用）

不需 Cloudflare 帳號，立即取得一個隨機的 `*.trycloudflare.com` 網址。

1. **安裝 cloudflared**
   - macOS (Homebrew): `brew install cloudflared`
   - Windows: 從 [Cloudflare 下載頁](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) 下載
   - Linux: 依官方文件安裝

2. **一鍵啟動（建議）**
   ```bash
   ./cloudflare/start-tunnel.sh
   ```
   會自動 build、啟動 Next.js，再啟動快速隧道。終端會顯示 `https://xxxx.trycloudflare.com`，用瀏覽器開啟即可。

   **或手動分步：** 先執行 `npm run build && npm run start`（本專案使用 port 3001），再另開終端執行：
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```

## 方式二：命名隧道（自訂網域，適合長期使用）

需要 Cloudflare 帳號與一個網域（可免費使用 Cloudflare 代管）。

1. **安裝並登入**
   ```bash
   cloudflared tunnel login
   ```
   會開啟瀏覽器，選擇網域並授權，憑證會寫入 `~/.cloudflared/`。

2. **建立隧道**
   ```bash
   cloudflared tunnel create kid-arithmetic
   ```
   會得到一個 **Tunnel ID**，並在 `~/.cloudflared/` 產生 `Tunnel_ID.json` 憑證檔。

3. **設定 DNS**
   在 Cloudflare Dashboard → 你的網域 → DNS → 新增一筆 **CNAME**：
   - 名稱：例如 `kid-arithmetic` 或 `math`（子網域）
   - 目標：`Tunnel_ID.cfargotunnel.com`（把 `Tunnel_ID` 換成上一步的 ID）

4. **撰寫設定檔**
   複製 `config.example.yml` 為 `config.yml`，填入：
   - `tunnel`: 你的 Tunnel ID
   - `credentials-file`: `~/.cloudflared/Tunnel_ID.json` 的實際路徑
   - `hostname`: 你要用的網域，例如 `kid-arithmetic.yourdomain.com`

5. **啟動 App 與隧道**
   ```bash
   npm run build && npm run start
   ```
   另開一個終端：
   ```bash
   cloudflared tunnel --config cloudflare/config.yml run
   ```
   之後透過你設定的 hostname 即可從外網存取。

## 注意事項

- 本機必須先執行 `npm run start`（或 `npm run dev`），Tunnel 才會把流量轉到 `localhost:3001`（本專案使用 port 3001）。
- **快速隧道網址在每次重開 tunnel 後會變更**；命名隧道搭配自訂網域則網址固定。
- 若使用 HTTPS 自訂網域，Cloudflare 會自動處理憑證，無需自行設定 SSL。

### 若出現 Error 1033（Cloudflare Tunnel error）

表示該 `*.trycloudflare.com` 網址對應的隧道已關閉或從未啟動。快速隧道**每次執行都會產生新網址**，舊網址會失效。做法：

1. **先關閉佔用 port 3001 的程式**（例如目前正在跑的 `npm run dev`）。
2. 執行 `./cloudflare/start-tunnel.sh`，等終端顯示 **新的** `https://xxxx.trycloudflare.com`。
3. 用瀏覽器開啟**這次顯示的新網址**，不要用上次的舊網址。
