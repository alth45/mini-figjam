// =========================================================================
// src/components/canvas/useCanvasRefs.ts
// Sinkronisasi ref berisi state terbaru agar handler global
// (pointermove / pointerup) selalu membaca nilai fresh tanpa
// me-re-attach listener setiap render.
// =========================================================================

"use client";

import { useEffect, useRef } from "react";
import type { UseCanvasViewReturn } from "@/hooks/useCanvasView";
import type { CanvasBoardActions } from "./types";

export function useCanvasRefs(
  board: CanvasBoardActions,
  canvasView: UseCanvasViewReturn,
) {
  const boardRef = useRef<CanvasBoardActions>(board);
  useEffect(() => {
    boardRef.current = board;
  }); // no deps — sync setiap render, tidak trigger re-render

  const viewRef = useRef<UseCanvasViewReturn>(canvasView);
  useEffect(() => {
    viewRef.current = canvasView;
  });

  return { boardRef, viewRef };
}
