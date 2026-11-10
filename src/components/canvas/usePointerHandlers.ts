// =========================================================================
// src/components/canvas/usePointerHandlers.ts
// Handler global pointermove / pointerup / pointercancel.
// Di-attach sekali ke document; membaca state via ref agar tidak
// perlu re-attach saat nilai berubah.
// =========================================================================

"use client";

import { useEffect, type RefObject } from "react";
import { DEFAULTS } from "@/lib/constants";
import { getElementBounds } from "@/lib/bounds";
import type { UseCanvasViewReturn } from "@/hooks/useCanvasView";
import type { CanvasBoardActions, DragState, MarqueeRect } from "./types";
import { rectsIntersect } from "./helpers";

interface Options {
  boardRef: RefObject<CanvasBoardActions>;
  viewRef: RefObject<UseCanvasViewReturn>;
  dragRef: RefObject<DragState | null>;
  setDragMode: (m: DragState["mode"] | null) => void;
  setMarqueeRect: (r: MarqueeRect | null) => void;
}

export function usePointerHandlers({
  boardRef,
  viewRef,
  dragRef,
  setDragMode,
  setMarqueeRect,
}: Options) {
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      const cv = viewRef.current;
      const b = boardRef.current;
      const pos = cv.getCanvasPos(e);

      switch (drag.mode) {
        case "pan": {
          cv.setView({
            x: drag.startViewX + (pos.x - drag.startScreen.x),
            y: drag.startViewY + (pos.y - drag.startScreen.y),
            zoom: drag.startZoom,
          });
          return;
        }

        case "move": {
          const dx = (pos.x - drag.startScreen.x) / drag.startZoom;
          const dy = (pos.y - drag.startScreen.y) / drag.startZoom;
          const updates = drag.origs.map((o) => {
            if (o.type === "arrow") {
              return {
                id: o.id,
                patch: {
                  x1: o.x1 + dx,
                  y1: o.y1 + dy,
                  x2: o.x2 + dx,
                  y2: o.y2 + dy,
                },
              };
            }
            if (o.type === "draw") {
              return {
                id: o.id,
                patch: {
                  points: o.points.map((p) => ({
                    x: p.x + dx,
                    y: p.y + dy,
                  })),
                },
              };
            }
            // arrow & draw di-handle → sisa tipe = BoxElement
            return { id: o.id, patch: { x: o.x + dx, y: o.y + dy } };
          });
          b.updateMany(updates);
          return;
        }

        case "resize": {
          const dx = (pos.x - drag.startScreen.x) / drag.startZoom;
          const dy = (pos.y - drag.startScreen.y) / drag.startZoom;
          const o = drag.orig;
          let x = o.x;
          let y = o.y;
          let w = o.w;
          let h = o.h;
          if (drag.handle.includes("w")) {
            x = o.x + dx;
            w = o.w - dx;
          }
          if (drag.handle.includes("e")) w = o.w + dx;
          if (drag.handle.includes("n")) {
            y = o.y + dy;
            h = o.h - dy;
          }
          if (drag.handle.includes("s")) h = o.h + dy;
          const MIN = 20;
          if (w < MIN) {
            w = MIN;
            if (drag.handle.includes("w")) x = o.x + o.w - MIN;
          }
          if (h < MIN) {
            h = MIN;
            if (drag.handle.includes("n")) y = o.y + o.h - MIN;
          }
          b.updateElement(drag.elementId, { x, y, w, h });
          return;
        }

        case "endpoint": {
          const wx = (pos.x - cv.view.x) / cv.view.zoom;
          const wy = (pos.y - cv.view.y) / cv.view.zoom;
          if (drag.which === "start") {
            b.updateElement(drag.elementId, { x1: wx, y1: wy });
          } else {
            b.updateElement(drag.elementId, { x2: wx, y2: wy });
          }
          return;
        }

        case "create-shape": {
          const wx = (pos.x - drag.startViewX) / drag.startZoom;
          const wy = (pos.y - drag.startViewY) / drag.startZoom;
          b.updateElement(drag.elementId, {
            x: Math.min(drag.startWorld.x, wx),
            y: Math.min(drag.startWorld.y, wy),
            w: Math.max(20, Math.abs(wx - drag.startWorld.x)),
            h: Math.max(20, Math.abs(wy - drag.startWorld.y)),
          });
          return;
        }

        case "create-arrow": {
          const wx = (pos.x - drag.startViewX) / drag.startZoom;
          const wy = (pos.y - drag.startViewY) / drag.startZoom;
          b.updateElement(drag.elementId, { x2: wx, y2: wy });
          return;
        }

        case "create-draw": {
          const dist = Math.hypot(
            pos.x - drag.lastScreen.x,
            pos.y - drag.lastScreen.y,
          );
          if (dist < DEFAULTS.draw.minDistance) return;

          const now = performance.now();
          const dt = Math.max(1, now - drag.lastTime);
          const speed = dist / dt;

          const wx = (pos.x - cv.view.x) / cv.view.zoom;
          const wy = (pos.y - cv.view.y) / cv.view.zoom;
          drag.lastScreen = pos;
          drag.lastTime = now;

          const point = { x: wx, y: wy } as {
            x: number;
            y: number;
            w?: number;
          };

          const el = b.getElement(drag.elementId);
          if (el?.type === "draw" && el.mode === "ink") {
            const widthMul = Math.max(0.35, Math.min(1.3, 1.3 - speed * 0.6));
            point.w = widthMul;
          }

          drag.points.push(point);
          b.updateElement(drag.elementId, { points: [...drag.points] });
          return;
        }

        case "marquee": {
          const dist = Math.hypot(
            pos.x - drag.startScreen.x,
            pos.y - drag.startScreen.y,
          );
          if (dist < 4) return;

          const x = Math.min(drag.startScreen.x, pos.x);
          const y = Math.min(drag.startScreen.y, pos.y);
          const w = Math.abs(pos.x - drag.startScreen.x);
          const h = Math.abs(pos.y - drag.startScreen.y);
          setMarqueeRect({ x, y, w, h });

          const wx1 = (x - cv.view.x) / cv.view.zoom;
          const wy1 = (y - cv.view.y) / cv.view.zoom;
          const wx2 = (x + w - cv.view.x) / cv.view.zoom;
          const wy2 = (y + h - cv.view.y) / cv.view.zoom;
          const rect = { x: wx1, y: wy1, w: wx2 - wx1, h: wy2 - wy1 };

          const hits = b.elements
            .filter((el) => rectsIntersect(getElementBounds(el), rect))
            .map((el) => el.id);

          const finalIds = drag.additive
            ? Array.from(new Set([...drag.baseSelection, ...hits]))
            : hits;
          b.selectMany(finalIds);
          return;
        }
      }
    };

    const handleUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      const b = boardRef.current;
      const cv = viewRef.current;
      const pos = cv.getCanvasPos(e);

      dragRef.current = null;
      setDragMode(null);

      switch (drag.mode) {
        case "pan":
          return;

        case "move":
        case "resize":
        case "endpoint":
          b.snapshot();
          return;

        case "marquee": {
          const dist = Math.hypot(
            pos.x - drag.startScreen.x,
            pos.y - drag.startScreen.y,
          );
          setMarqueeRect(null);
          if (dist < 4 && !drag.additive) {
            b.selectElement(null);
          }
          return;
        }

        case "create-shape": {
          const el = b.getElement(drag.elementId);
          if (el && (el.type === "rect" || el.type === "ellipse")) {
            if (el.w < 8 && el.h < 8) {
              b.deleteElement(el.id);
            } else {
              b.selectElement(el.id);
              b.snapshot();
            }
          }
          b.setTool("select");
          return;
        }

        case "create-arrow": {
          const el = b.getElement(drag.elementId);
          if (el && el.type === "arrow") {
            const len = Math.hypot(el.x2 - el.x1, el.y2 - el.y1);
            if (len < DEFAULTS.arrow.minLength) {
              b.deleteElement(el.id);
            } else {
              b.selectElement(el.id);
              b.snapshot();
            }
          }
          b.setTool("select");
          return;
        }

        case "create-draw": {
          if (drag.points.length < DEFAULTS.draw.minPoints) {
            b.deleteElement(drag.elementId);
          } else {
            b.selectElement(drag.elementId);
            b.snapshot();
          }
          b.setTool("select");
          return;
        }
      }
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("pointercancel", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("pointercancel", handleUp);
    };
  }, [boardRef, viewRef, dragRef, setDragMode, setMarqueeRect]);
}
