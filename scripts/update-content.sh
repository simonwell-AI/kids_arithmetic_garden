#!/usr/bin/env bash
set -e

echo "Stopping any process on port 3001..."
PID=$(lsof -ti:3001 2>/dev/null) && kill -9 $PID 2>/dev/null || true

echo "Building Next.js app..."
npm run build

echo "Starting server at http://localhost:3001"
echo "在 Cursor 內部瀏覽器或一般瀏覽器開啟: http://localhost:3001"
npm run start
