// =========================================================================
// src/components/board-app/useBoardRefs.ts
// Menyimpan snapshot state terbaru di ref agar handler global
// (keyboard, action) selalu membaca nilai fresh tanpa re-attach listener.
// =========================================================================

"use client";

import { useEffect, useRef } from "react";
import type { Tool } from "@/lib/types";
import type { UseBoardStateReturn } from "@/hooks/useBoardState";
import type { UseCanvasViewReturn } from "@/hooks/useCanvasView";
import type { BoardDialog } from "./types";

export interface BoardRefsShape {
  board: UseBoardStateReturn;
  canvasView: UseCanvasViewReturn;
  tool: Tool;
  dialog: BoardDialog | null;
}

export function useBoardRefs(shape: BoardRefsShape) {
  const refsRef = useRef<BoardRefsShape>(shape);
  useEffect(() => {
    refsRef.current = shape;
  }); // no deps — sync setiap render, tidak trigger re-render
  return refsRef;
}
