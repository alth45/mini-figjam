// =========================================================================
// src/components/canvas/types.ts
// Tipe bersama untuk Canvas + hooks-nya.
// =========================================================================

import type { BoardElement, DrawPoint, Point, Tool } from "@/lib/types";
import type { UseCanvasViewReturn } from "@/hooks/useCanvasView";

export interface CanvasProps extends CanvasBoardActions {
  editingId: string | null;
  tool: Tool;
  spaceHeld: boolean;
  gridVisible: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  canvasView: UseCanvasViewReturn;
}

/** Snapshot aksi board — dipakai di boardRef untuk akses handler global. */
export interface CanvasBoardActions {
  elements: BoardElement[];
  selectedIds: string[];
  selectElement: (
    id: string | null,
    mode?: "replace" | "toggle" | "add",
  ) => void;
  selectMany: (ids: string[]) => void;
  addElement: (el: BoardElement) => void;
  updateElement: (id: string, patch: Partial<BoardElement>) => void;
  updateMany: (updates: { id: string; patch: Partial<BoardElement> }[]) => void;
  deleteElement: (id: string) => void;
  startEdit: (id: string) => void;
  commitEdit: (id: string, text: string) => void;
  snapshot: () => void;
  setTool: (t: Tool) => void;
  getElement: (id: string) => BoardElement | undefined;
}

export interface MarqueeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type DragState =
  | {
      mode: "pan";
      pointerId: number;
      startScreen: Point;
      startViewX: number;
      startViewY: number;
      startZoom: number;
    }
  | {
      mode: "move";
      pointerId: number;
      startScreen: Point;
      startZoom: number;
      origs: BoardElement[];
    }
  | {
      mode: "resize";
      pointerId: number;
      elementId: string;
      handle: "nw" | "ne" | "sw" | "se";
      startScreen: Point;
      startZoom: number;
      orig: { x: number; y: number; w: number; h: number };
    }
  | {
      mode: "endpoint";
      pointerId: number;
      elementId: string;
      which: "start" | "end";
    }
  | {
      mode: "create-shape";
      pointerId: number;
      elementId: string;
      startScreen: Point;
      startWorld: Point;
      startViewX: number;
      startViewY: number;
      startZoom: number;
    }
  | {
      mode: "create-arrow";
      pointerId: number;
      elementId: string;
      startScreen: Point;
      startWorld: Point;
      startViewX: number;
      startViewY: number;
      startZoom: number;
    }
  | {
      mode: "create-draw";
      pointerId: number;
      elementId: string;
      lastScreen: Point;
      lastTime: number;
      points: DrawPoint[];
    }
  | {
      mode: "marquee";
      pointerId: number;
      startScreen: Point;
      additive: boolean;
      baseSelection: string[];
    };
