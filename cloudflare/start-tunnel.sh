#!/usr/bin/env bash
# 啟動 Next.js 並建立 Cloudflare 快速隧道，產生公開網址
# 使用方式：./cloudflare/start-tunnel.sh  或  bash cloudflare/start-tunnel.sh

set -e
cd "$(dirname "$0")/.."

echo "Building Next.js app..."
npm run build

echo "Starting Next.js on http://localhost:3001 ..."
npm run start &
SERVER_PID=$!

# 等伺服器就緒
sleep 5

echo "Starting Cloudflare Tunnel (quick tunnel)..."
echo "公開網址會顯示在下方，用瀏覽器開啟即可。"
echo "按 Ctrl+C 可同時停止隧道與本機伺服器。"
echo ""

cleanup() {
  echo ""
  echo "Stopping server (PID $SERVER_PID)..."
  kill $SERVER_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

cloudflared tunnel --url http://localhost:3001
