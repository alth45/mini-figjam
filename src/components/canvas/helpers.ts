// =========================================================================
// src/components/canvas/helpers.ts
// Helper murni untuk Canvas (cursor, type guard, rect intersection).
// =========================================================================

import type { BoardElement, Tool } from "@/lib/types";
import type { DragState } from "./types";

export function getCursorFor(
  tool: Tool,
  spaceHeld: boolean,
  dragMode: DragState["mode"] | null,
): string {
  if (dragMode === "pan") return "grabbing";
  if (dragMode === "move") return "move";
  if (dragMode === "marquee") return "crosshair";
  if (
    dragMode === "create-shape" ||
    dragMode === "create-arrow" ||
    dragMode === "create-draw"
  )
    return "crosshair";
  if (dragMode === "resize" || dragMode === "endpoint") return "nwse-resize";
  if (spaceHeld) return "grab";
  if (tool === "hand") return "grab";
  if (tool === "text" || tool === "sticky") return "cell";
  if (tool === "eraser") return "not-allowed";
  if (tool === "mindmap") return "copy";
  if (tool === "select") return "default";
  return "crosshair";
}

export function isBoxElement(
  el: BoardElement,
): el is Extract<BoardElement, { w: number; h: number }> {
  return "x" in el && "y" in el && "w" in el && "h" in el;
}

/** Bounding-rect intersection test (world coords). */
export function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(
    a.x + a.w < b.x ||
    a.x > b.x + b.w ||
    a.y + a.h < b.y ||
    a.y > b.y + b.h
  );
}
