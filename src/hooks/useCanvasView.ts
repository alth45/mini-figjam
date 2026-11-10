// =========================================================================
// src/hooks/useCanvasView.ts
// Hook untuk pan, zoom, dan konversi koordinat kanvas.
// =========================================================================

"use client";

import { useCallback, useState } from "react";
import type { BoardElement, Point, ViewState } from "@/lib/types";
import {
  DEFAULT_VIEW,
  ZOOM_LIMITS,
  ZOOM_FIT_PADDING,
  GRID_CSS_VARS,
} from "@/lib/constants";

// -------------------------------------------------------------------------
// 1. HELPER MURNI (bisa di-test terpisah)
// -------------------------------------------------------------------------

/** Konversi koordinat world → koordinat layar (relatif ke canvas). */
export function worldToScreen(view: ViewState, wx: number, wy: number): Point {
  return { x: wx * view.zoom + view.x, y: wy * view.zoom + view.y };
}

/** Konversi koordinat layar (relatif ke canvas) → koordinat world. */
export function screenToWorld(view: ViewState, sx: number, sy: number): Point {
  return { x: (sx - view.x) / view.zoom, y: (sy - view.y) / view.zoom };
}

/**
 * Hitung bounding box gabungan semua elemen.
 * Mengembalikan null jika tidak ada elemen.
 */
function getContentBounds(
  elements: BoardElement[],
): { x: number; y: number; w: number; h: number } | null {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    let x = 0;
    let y = 0;
    let w = 0;
    let h = 0;

    switch (el.type) {
      case "arrow": {
        x = Math.min(el.x1, el.x2);
        y = Math.min(el.y1, el.y2);
        w = Math.abs(el.x2 - el.x1);
        h = Math.abs(el.y2 - el.y1);
        break;
      }
      case "draw": {
        let mnx = Infinity;
        let mny = Infinity;
        let mxx = -Infinity;
        let mxy = -Infinity;
        for (const p of el.points) {
          if (p.x < mnx) mnx = p.x;
          if (p.y < mny) mny = p.y;
          if (p.x > mxx) mxx = p.x;
          if (p.y > mxy) mxy = p.y;
        }
        x = mnx;
        y = mny;
        w = mxx - mnx;
        h = mxy - mny;
        break;
      }
      default: {
        x = el.x;
        y = el.y;
        w = el.w;
        h = el.h;
      }
    }

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// -------------------------------------------------------------------------
// 2. TIPE RETURN
// -------------------------------------------------------------------------

export interface UseCanvasViewReturn {
  view: ViewState;

  /** Set view langsung (dipakai saat load board). */
  setView: (view: ViewState) => void;

  /** Ambil posisi pointer relatif terhadap canvas (bukan viewport). */
  getCanvasPos: (e: { clientX: number; clientY: number }) => Point;

  /** Konversi layar ↔ world memakai view saat ini. */
  toWorld: (sx: number, sy: number) => Point;
  toScreen: (wx: number, wy: number) => Point;

  /** Zoom di sekitar titik (cx, cy) di koordinat canvas. */
  zoomAt: (factor: number, cx: number, cy: number) => void;

  /** Zoom di tengah canvas. */
  zoomIn: () => void;
  zoomOut: () => void;

  /** Reset ke zoom 100%. */
  resetZoom: () => void;

  /** Fit seluruh konten ke viewport. */
  zoomFit: (elements: BoardElement[]) => void;

  /** Handler wheel untuk pan/zoom (passive:false, dipanggil dari Canvas). */
  handleWheel: (e: React.WheelEvent) => void;

  /** Mulai pan; mengembalikan handler move/up untuk didaftarkan. */
  startPan: (
    e: React.PointerEvent,
    onCursorChange?: (cursor: string) => void,
  ) => void;
}

// -------------------------------------------------------------------------
// 3. HOOK
// -------------------------------------------------------------------------

export function useCanvasView(
  canvasRef: React.RefObject<HTMLElement | null>,
): UseCanvasViewReturn {
  const [view, setViewState] = useState<ViewState>({ ...DEFAULT_VIEW });

  // ----- Set view (langsung) -----
  const setView = useCallback((next: ViewState) => {
    setViewState(next);
  }, []);

  // ----- Konversi -----
  const getCanvasPos = useCallback(
    (e: { clientX: number; clientY: number }): Point => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: e.clientX, y: e.clientY };
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [canvasRef],
  );

  const toWorld = useCallback(
    (sx: number, sy: number) => screenToWorld(view, sx, sy),
    [view],
  );

  const toScreen = useCallback(
    (wx: number, wy: number) => worldToScreen(view, wx, wy),
    [view],
  );

  // ----- Zoom -----
  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setViewState((prev) => {
      const nextZoom = Math.max(
        ZOOM_LIMITS.min,
        Math.min(ZOOM_LIMITS.max, prev.zoom * factor),
      );
      // Jika zoom tidak berubah (sudah di limit), jangan geser
      if (nextZoom === prev.zoom) return prev;

      const wx = (cx - prev.x) / prev.zoom;
      const wy = (cy - prev.y) / prev.zoom;

      return {
        zoom: nextZoom,
        x: cx - wx * nextZoom,
        y: cy - wy * nextZoom,
      };
    });
  }, []);

  const zoomIn = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : 0;
    const cy = rect ? rect.height / 2 : 0;
    zoomAt(ZOOM_LIMITS.inFactor, cx, cy);
  }, [canvasRef, zoomAt]);

  const zoomOut = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : 0;
    const cy = rect ? rect.height / 2 : 0;
    zoomAt(ZOOM_LIMITS.outFactor, cx, cy);
  }, [canvasRef, zoomAt]);

  const resetZoom = useCallback(() => {
    setViewState((prev) => ({ ...prev, zoom: 1 }));
  }, []);

  const zoomFit = useCallback(
    (elements: BoardElement[]) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (elements.length === 0) {
        setViewState({ ...DEFAULT_VIEW });
        return;
      }

      const bounds = getContentBounds(elements);
      if (!bounds) return;

      const pad = ZOOM_FIT_PADDING;
      const availW = rect.width - pad * 2;
      const availH = rect.height - pad * 2;

      // Hindari bagi nol untuk konten titik/garis tipis
      const w = bounds.w || 1;
      const h = bounds.h || 1;

      const zx = availW / w;
      const zy = availH / h;
      const z = Math.max(ZOOM_LIMITS.min, Math.min(2, Math.min(zx, zy)));

      setViewState({
        zoom: z,
        x: pad - bounds.x * z + (availW - bounds.w * z) / 2,
        y: pad - bounds.y * z + (availH - bounds.h * z) / 2,
      });
    },
    [canvasRef],
  );

  // ----- Wheel: Ctrl/Cmd = zoom, lainnya = pan -----
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const pos = getCanvasPos(e);
        zoomAt(
          e.deltaY < 0 ? ZOOM_LIMITS.wheelIn : ZOOM_LIMITS.wheelOut,
          pos.x,
          pos.y,
        );
      } else {
        setViewState((prev) => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    },
    [getCanvasPos, zoomAt],
  );

  // ----- Pan (drag dengan space / hand) -----
  const startPan = useCallback(
    (e: React.PointerEvent, onCursorChange?: (cursor: string) => void) => {
      const startX = e.clientX;
      const startY = e.clientY;
      const startView = { x: view.x, y: view.y };
      const pointerId = e.pointerId;

      onCursorChange?.("grabbing");

      const handleMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        setViewState((prev) => ({
          ...prev,
          x: startView.x + (ev.clientX - startX),
          y: startView.y + (ev.clientY - startY),
        }));
      };

      const handleUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        onCursorChange?.("grab");
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [view.x, view.y],
  );

  return {
    view,
    setView,
    getCanvasPos,
    toWorld,
    toScreen,
    zoomAt,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomFit,
    handleWheel,
    startPan,
  };
}
