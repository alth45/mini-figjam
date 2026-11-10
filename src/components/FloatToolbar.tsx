"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import type { BoardElement, BoardElementPatch, ViewState } from "@/lib/types";
import {
  MIND_NODE_COLORS,
  SHAPE_COLORS,
  STICKY_COLORS,
  STROKE_COLORS,
  TEXT_COLORS,
} from "@/lib/constants";
import { worldToScreen } from "@/hooks/useCanvasView";
import { getElementBounds } from "@/lib/bounds";

interface FloatToolbarProps {
  elements: BoardElement[];
  isEditing: boolean;
  view: ViewState;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onUpdate: (id: string, patch: BoardElementPatch) => void;
  onDelete: () => void;
  onSnapshot: () => void;
}

interface PaletteInfo {
  colors: readonly string[];
  current: string;
}

function getPalette(el: BoardElement): PaletteInfo | null {
  switch (el.type) {
    case "sticky":
      return { colors: STICKY_COLORS, current: el.color };
    case "text":
      return { colors: TEXT_COLORS, current: el.color };
    case "rect":
    case "ellipse":
      return { colors: SHAPE_COLORS, current: el.fill };
    case "arrow":
    case "draw":
      return { colors: STROKE_COLORS, current: el.color };
    case "mindnode":
      return { colors: MIND_NODE_COLORS, current: el.color };
  }
}

function getCombinedBounds(elements: BoardElement[]): {
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  if (elements.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    const b = getElementBounds(el);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function FloatToolbar({
  elements,
  isEditing,
  view,
  canvasRef,
  onUpdate,
  onDelete,
  onSnapshot,
}: FloatToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [resizeTick, setResizeTick] = useState(0);

  useEffect(() => {
    const handler = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // =======================================================================
  // POSISI — mutate DOM langsung, bukan setState.
  //
  // useLayoutEffect berjalan setelah commit tapi SEBELUM browser paint,
  // jadi perubahan style.left/top di sini langsung terlihat user tanpa
  // flash. Tidak ada setState → tidak ada cascading render, tidak ada
  // lint error, dan toolbar tidak pernah "berkedip" di posisi lama.
  //
  // JSX tidak menyentuh style.left/top sama sekali, sehingga mutasi
  // imperative kita tidak di-overwrite oleh React saat re-render.
  // =======================================================================
  useLayoutEffect(() => {
    const bar = toolbarRef.current;
    const canvas = canvasRef.current;
    if (!bar || !canvas) return;

    const b = getCombinedBounds(elements);
    if (!b) return;

    const barW = bar.offsetWidth;
    const barH = bar.offsetHeight;

    const tl = worldToScreen(view, b.x, b.y);
    const br = worldToScreen(view, b.x + b.w, b.y + b.h);

    let x = tl.x + (br.x - tl.x) / 2 - barW / 2;
    let y = tl.y - barH - 10;
    if (y < 48) y = br.y + 10;
    x = Math.max(8, Math.min(x, canvas.clientWidth - barW - 8));

    bar.style.left = `${x}px`;
    bar.style.top = `${y}px`;
  }, [elements, isEditing, view, canvasRef, resizeTick]);

  if (elements.length === 0 || isEditing) return null;

  const isMulti = elements.length > 1;
  const single = isMulti ? null : elements[0];
  const palette = single ? getPalette(single) : null;

  const applyColor = (color: string) => {
    if (!single) return;
    if (single.type === "rect" || single.type === "ellipse") {
      onUpdate(single.id, { fill: color });
    } else {
      onUpdate(single.id, { color });
    }
    onSnapshot();
  };

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Format elemen"
      // ⚠️ style.left dan style.top SENGAJA tidak ada di sini.
      // useLayoutEffect yang mengaturnya secara imperative.
      style={{ left: 0, top: 0, visibility: "hidden" }}
      data-toolbar="float"
      className="absolute z-40 flex items-center gap-1 rounded-[10px] border border-border bg-panel p-1.5 shadow-lg"
    >
      {palette &&
        palette.colors.map((c) => {
          const isActive = palette.current === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => applyColor(c)}
              title={`Warna ${c}`}
              aria-label={`Warna ${c}`}
              aria-pressed={isActive}
              style={{ backgroundColor: c }}
              className={[
                "h-[22px] w-[22px] rounded-[5px] border-[1.5px]",
                "transition-transform duration-100 hover:scale-[1.15]",
                "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                isActive
                  ? "border-accent ring-2 ring-accent-soft"
                  : "border-black/[0.08]",
              ].join(" ")}
            />
          );
        })}

      {isMulti && (
        <span className="px-2 text-[11px] font-medium text-muted">
          {elements.length} elemen
        </span>
      )}

      <div className="mx-1 h-[22px] w-px bg-border" aria-hidden="true" />

      <button
        type="button"
        onClick={onDelete}
        title="Hapus (Del)"
        aria-label="Hapus"
        className="flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-ink transition-colors duration-100 hover:bg-red-100 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
