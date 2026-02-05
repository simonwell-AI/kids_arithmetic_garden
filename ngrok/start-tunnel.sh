#!/usr/bin/env bash
# 啟動 Next.js 並用 ngrok 建立公開網址（需先安裝 ngrok 並設定 token）
# 使用方式：./ngrok/start-tunnel.sh  或  bash ngrok/start-tunnel.sh

set -e
cd "$(dirname "$0")/.."

# 載入 ngrok token（從 ngrok/.env，勿提交到 git）
if [ -f "ngrok/.env" ]; then
  set -a
  source ngrok/.env
  set +a
fi
if [ -z "$NGROK_AUTHTOKEN" ]; then
  echo "錯誤：請在 ngrok/.env 設定 NGROK_AUTHTOKEN=你的token"
  echo "或執行：export NGROK_AUTHTOKEN=你的token"
  exit 1
fi

echo "Building Next.js app..."
npm run build

echo "Starting Next.js on http://localhost:3001 ..."
npm run start &
SERVER_PID=$!

sleep 5

echo "Starting ngrok tunnel..."
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

ngrok http 3001
