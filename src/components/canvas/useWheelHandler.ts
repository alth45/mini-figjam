// =========================================================================
// src/components/canvas/useWheelHandler.ts
// Wheel native listener dengan { passive: false } agar preventDefault
// berfungsi. Ctrl/Cmd + wheel = zoom, wheel biasa = pan.
// =========================================================================

"use client";

import { useEffect, type RefObject } from "react";
import { ZOOM_LIMITS } from "@/lib/constants";
import type { UseCanvasViewReturn } from "@/hooks/useCanvasView";

export function useWheelHandler(
  canvasRef: RefObject<HTMLDivElement | null>,
  viewRef: RefObject<UseCanvasViewReturn>,
) {
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      if (
        (e.target as HTMLElement | null)?.closest?.('[contenteditable="true"]')
      )
        return;
      e.preventDefault();

      const cv = viewRef.current;
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        cv.zoomAt(
          e.deltaY < 0 ? ZOOM_LIMITS.wheelIn : ZOOM_LIMITS.wheelOut,
          sx,
          sy,
        );
      } else {
        cv.setView({
          x: cv.view.x - e.deltaX,
          y: cv.view.y - e.deltaY,
          zoom: cv.view.zoom,
        });
      }
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [canvasRef, viewRef]);
}
