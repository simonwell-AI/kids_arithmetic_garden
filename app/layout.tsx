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
  icons: {
    icon: [
      { url: "/favicon_io/favicon.ico", sizes: "any" },
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/favicon_io/apple-touch-icon.png",
  },
  manifest: "/favicon_io/site.webmanifest",
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
        className={`${nunito.variable} flex min-h-[100dvh] flex-col font-sans antialiased safe-area-padding`}
        suppressHydrationWarning
      >
        <BGMControl />
        <main className="flex-1">{children}</main>
        <footer className="shrink-0 border-t border-gray-200 bg-gray-50 py-3 text-center text-sm text-gray-600">
          © 2026 張賽門 (Simon Chang). All rights reserved.
        </footer>
      </body>
    </html>
  );
}
