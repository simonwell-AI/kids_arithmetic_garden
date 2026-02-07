import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 關閉左下角開發除錯圖示，避免小朋友誤觸
  devIndicators: false,
  // 明確指定專案根目錄，避免 Next 偵測到上層 lockfile 時推斷錯誤
  turbopack: { root: process.cwd() },
};

export default nextConfig;
