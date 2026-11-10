// =========================================================================
// src/components/SelectionOverlay.tsx
// Overlay seleksi: 1 elemen → handles, N elemen → bounding box.
// =========================================================================

"use client";

import type { BoardElement, ViewState } from "@/lib/types";
import { worldToScreen } from "@/hooks/useCanvasView";
import { getElementBounds } from "@/lib/bounds";

interface SelectionOverlayProps {
  elements: BoardElement[];
  isEditing: boolean;
  view: ViewState;
}

const HANDLE_CURSORS = {
  nw: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  se: "nwse-resize",
} as const;

export function SelectionOverlay({
  elements,
  isEditing,
  view,
}: SelectionOverlayProps) {
  if (elements.length === 0 || isEditing) return null;

  // ---- 1 elemen: perilaku lama ----
  if (elements.length === 1) {
    const element = elements[0];

    if (element.type === "arrow") {
      const s1 = worldToScreen(view, element.x1, element.y1);
      const s2 = worldToScreen(view, element.x2, element.y2);
      return (
        <>
          <div
            data-handle="start"
            className="absolute h-3 w-3 rounded-full border-[1.5px] border-accent bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] pointer-events-auto cursor-move"
            style={{ left: s1.x - 6, top: s1.y - 6 }}
          />
          <div
            data-handle="end"
            className="absolute h-3 w-3 rounded-full border-[1.5px] border-accent bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] pointer-events-auto cursor-move"
            style={{ left: s2.x - 6, top: s2.y - 6 }}
          />
        </>
      );
    }

    const bounds = getElementBounds(element);
    const tl = worldToScreen(view, bounds.x, bounds.y);
    const br = worldToScreen(view, bounds.x + bounds.w, bounds.y + bounds.h);
    const showHandles = element.type !== "draw";

    return (
      <div
        className="absolute border-[1.5px] border-accent pointer-events-none"
        style={{
          left: tl.x,
          top: tl.y,
          width: Math.max(1, br.x - tl.x),
          height: Math.max(1, br.y - tl.y),
        }}
      >
        {showHandles &&
          (["nw", "ne", "sw", "se"] as const).map((h) => {
            const isN = h.includes("n");
            const isW = h.includes("w");
            return (
              <div
                key={h}
                data-handle={h}
                className="absolute h-2.5 w-2.5 rounded-sm border-[1.5px] border-accent bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] pointer-events-auto"
                style={{
                  [isN ? "top" : "bottom"]: -5,
                  [isW ? "left" : "right"]: -5,
                  cursor: HANDLE_CURSORS[h],
                }}
              />
            );
          })}
      </div>
    );
  }

  // ---- Multi: bounding box semua elemen terpilih (tanpa handle) ----
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

  const tl = worldToScreen(view, minX, minY);
  const br = worldToScreen(view, maxX, maxY);

  return (
    <div
      className="absolute border-[1.5px] border-accent bg-accent/5 pointer-events-none"
      style={{
        left: tl.x - 4,
        top: tl.y - 4,
        width: Math.max(1, br.x - tl.x) + 8,
        height: Math.max(1, br.y - tl.y) + 8,
      }}
    >
      <span className="absolute -top-6 left-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {elements.length} elemen
      </span>
    </div>
  );
}
