"use client";

import { useMemo } from "react";

const CONFETTI_IMAGE = "/celebration-assets/confetti.png";

/** 彩帶圖＋圓點飄落，用於今日任務完成、7 天連續等慶祝 */
export function CelebrationParticles() {
  const dots = useMemo(() => {
    const colors = [
      "bg-amber-300",
      "bg-amber-400",
      "bg-yellow-300",
      "bg-orange-300",
      "bg-amber-200",
    ];
    return Array.from({ length: 16 }, (_, i) => ({
      id: `dot-${i}`,
      left: (i * 11 + 2) % 100,
      delay: (i * 0.12) % 2.5,
      duration: 2.5 + (i % 3) * 0.5,
      color: colors[i % colors.length],
      size: 8 + (i % 3) * 4,
      rotation: i % 2 === 0 ? 0 : 45,
    }));
  }, []);

  const confetti = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: `confetti-${i}`,
      left: (i * 13 + 5) % 100,
      delay: (i * 0.18) % 2.8,
      duration: 3 + (i % 2) * 0.6,
      size: 24 + (i % 3) * 12,
      rotate: i * 30,
    }));
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[15] overflow-hidden"
      aria-hidden
    >
      {dots.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-full ${p.color}`}
          style={{
            left: `${p.left}%`,
            top: "-20px",
            width: p.size,
            height: p.size,
            transform: `rotate(${p.rotation}deg)`,
            animation: "star-fall 3s ease-in forwards",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      {confetti.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: "-40px",
            width: p.size,
            height: p.size * 2,
            backgroundImage: `url(${CONFETTI_IMAGE})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            transform: `rotate(${p.rotate}deg)`,
            animation: "star-fall 3s ease-in forwards",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
