// =========================================================================
// src/lib/bounds.ts
// Helper untuk menghitung bounding box elemen dalam koordinat WORLD.
// Dipakai oleh SelectionOverlay, FloatToolbar, dan StatusBar.
// =========================================================================

import type { BoardElement, Bounds } from "./types";

/**
 * Bounding box satu elemen di koordinat world.
 * - box elements (sticky/text/rect/ellipse): x/y/w/h langsung
 * - arrow: min/max dari (x1,y1)-(x2,y2)
 * - draw: min/max dari semua points
 */
export function getElementBounds(el: BoardElement): Bounds {
  switch (el.type) {
    case "arrow":
      return {
        x: Math.min(el.x1, el.x2),
        y: Math.min(el.y1, el.y2),
        w: Math.abs(el.x2 - el.x1),
        h: Math.abs(el.y2 - el.y1),
      };

    case "draw": {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const p of el.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    default:
      return { x: el.x, y: el.y, w: el.w, h: el.h };
  }
}
