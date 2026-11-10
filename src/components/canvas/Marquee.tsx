// =========================================================================
// src/components/canvas/Marquee.tsx
// Kotak seleksi sementara selama drag di area kosong.
// =========================================================================

"use client";

import type { MarqueeRect } from "./types";

export function Marquee({ rect }: { rect: MarqueeRect | null }) {
  if (!rect) return null;
  return (
    <div
      className="absolute border border-accent bg-accent/10 pointer-events-none"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
      }}
    />
  );
}
