// =========================================================================
// src/components/ZoomControls.tsx
// Kontrol zoom di kiri-bawah workspace:
//   [ − ] [ 100% ] [ + ]
// Klik nilai zoom → reset ke 100%.
// =========================================================================

"use client";

import { Minus, Plus } from "lucide-react";

// -------------------------------------------------------------------------
// PROPS
// -------------------------------------------------------------------------
interface ZoomControlsProps {
  /** Nilai zoom saat ini, misal 1.25 → ditampilkan "125%". */
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Klik nilai zoom (reset ke 100%). */
  onReset: () => void;
}

// -------------------------------------------------------------------------
// COMPONENT
// -------------------------------------------------------------------------
export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: ZoomControlsProps) {
  const percent = Math.round(zoom * 100);

  return (
    <div
      className="absolute bottom-3.5 left-3.5 z-30 flex h-8 items-center overflow-hidden rounded-[10px] border border-border bg-panel shadow-md"
      role="group"
      aria-label="Kontrol zoom"
    >
      <button
        type="button"
        onClick={onZoomOut}
        title="Perkecil (Ctrl -)"
        aria-label="Perkecil"
        className="flex h-8 w-8 items-center justify-center text-gray-600 transition-colors duration-100 hover:bg-gray-100"
      >
        <Minus size={14} strokeWidth={2} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onReset}
        title="Reset ke 100% (Ctrl 0)"
        aria-label={`Zoom ${percent}%, klik untuk reset`}
        className="h-8 w-[54px] border-x border-border bg-transparent text-center text-[11.5px] font-semibold text-ink transition-colors duration-100 hover:bg-gray-100"
      >
        {percent}%
      </button>

      <button
        type="button"
        onClick={onZoomIn}
        title="Perbesar (Ctrl +)"
        aria-label="Perbesar"
        className="flex h-8 w-8 items-center justify-center text-gray-600 transition-colors duration-100 hover:bg-gray-100"
      >
        <Plus size={14} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
