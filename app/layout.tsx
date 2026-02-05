import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import BGMControl from "@/src/components/BGMControl";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "算術練習 | Kid Arithmetic",
  description: "兒童算術練習：加減乘除與九九乘法表",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body
        className={`${nunito.variable} font-sans antialiased min-h-[100dvh] safe-area-padding`}
        suppressHydrationWarning
      >
        <BGMControl />
        {children}
      </body>
    </html>
  );
}
