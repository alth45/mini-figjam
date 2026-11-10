// =========================================================================
// src/lib/types.ts
// Fondasi tipe untuk seluruh board. Semua komponen dan hook harus
// menggunakan tipe dari file ini agar konsisten.
// =========================================================================

// -------------------------------------------------------------------------
// 1. TOOL
// -------------------------------------------------------------------------
export type Tool =
  | "select"
  | "hand"
  | "sticky"
  | "text"
  | "rect"
  | "ellipse"
  | "arrow"
  | "pen"
  | "eraser"
  | "mindmap";

// -------------------------------------------------------------------------
// 2. VIEW (pan + zoom)
// -------------------------------------------------------------------------
export interface ViewState {
  x: number;
  y: number;
  zoom: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

// -------------------------------------------------------------------------
// 3. ELEMEN — DISCRIMINATED UNION
// -------------------------------------------------------------------------
// Setiap elemen memiliki `id` unik dan `type` sebagai diskriminator.
// BaseElement sengaja tidak punya properti geometri karena tiap tipe
// punya bentuk geometri yang berbeda (arrow pakai x1/y1/x2/y2, draw pakai
// points[], sticky/text/rect/ellipse pakai x/y/w/h).
// -------------------------------------------------------------------------

export interface BaseElement {
  id: string;
  type: ElementType;
}

export type ElementType =
  | "sticky"
  | "text"
  | "rect"
  | "ellipse"
  | "arrow"
  | "draw"
  | "mindnode";

// Tambah interface baru
export interface MindNodeElement extends BaseElement {
  type: "mindnode";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
  /** null = root */
  parentId: string | null;
  /** 0 = root, makin dalam makin besar. Untuk warna & styling. */
  depth: number;
}

/** Sticky note: kotak berwarna dengan teks. */
export interface StickyElement extends BaseElement {
  type: "sticky";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  text: string;
}

export type TextAlign = "left" | "center" | "right";

/** Teks bebas (bukan sticky) — bisa bold, punya font size & align. */
export interface TextElement extends BaseElement {
  type: "text";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  fontSize: number;
  color: string;
  bold: boolean;
  align: TextAlign;
}

/** Persegi / kotak. Fill bisa `"transparent"` untuk frame tanpa isi. */
export interface RectElement extends BaseElement {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

/** Panah dari (x1,y1) ke (x2,y2). */
export interface ArrowElement extends BaseElement {
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
}

/** Goresan bebas — polyline dari array titik. */
export interface DrawElement extends BaseElement {
  type: "draw";
  points: Point[];
  color: string;
  strokeWidth: number;
}

/** Union semua elemen. Gunakan `switch (el.type)` untuk narrowing. */
export type BoardElement =
  | StickyElement
  | TextElement
  | RectElement
  | EllipseElement
  | ArrowElement
  | DrawElement
  | MindNodeElement;

// -------------------------------------------------------------------------
// 4. HELPER TIPE — NARROWING
// -------------------------------------------------------------------------
// Beberapa helper untuk mempercepat pengecekan tipe di komponen.
// -------------------------------------------------------------------------

/** Elemen yang punya geometri x/y/w/h (sticky, text, rect, ellipse). */
export type BoxElement =
  | StickyElement
  | TextElement
  | RectElement
  | EllipseElement
  | MindNodeElement;

/** Elemen yang bisa diedit teksnya (contentEditable). */
export type EditableElement = StickyElement | TextElement;

/** Elemen yang mendukung resize via handle sudut. */
export type ResizableElement = BoxElement;

/** Type guard: apakah elemen punya x/y/w/h? */
export function isBoxElement(el: BoardElement): el is BoxElement {
  return (
    el.type === "sticky" ||
    el.type === "text" ||
    el.type === "rect" ||
    el.type === "ellipse" ||
    el.type === "mindnode"
  );
}

/** Type guard: apakah elemen bisa diedit teks? */
export function isEditableElement(el: BoardElement): el is EditableElement {
  return el.type === "sticky" || el.type === "text" || el.type === "mindnode";
}

// -------------------------------------------------------------------------
// 5. HANDLE RESIZE
// -------------------------------------------------------------------------
// Sudut resize untuk elemen kotak, atau endpoint untuk panah.
// -------------------------------------------------------------------------
export type ResizeHandle = "nw" | "ne" | "sw" | "se";
export type EndpointHandle = "start" | "end";

// -------------------------------------------------------------------------
// 6. DRAG STATE
// -------------------------------------------------------------------------
// State sementara selama interaksi pointer (drag, resize, create).
// Disimpan di useRef, bukan useState, agar tidak trigger re-render.
// -------------------------------------------------------------------------

export type DragState =
  | {
      mode: "move";
      elementId: string;
      startScreen: Point;
      // snapshot posisi awal — untuk arrow & draw, snapshot berbeda
      orig: {
        x: number;
        y: number;
        w?: number;
        h?: number;
        x1?: number;
        y1?: number;
        x2?: number;
        y2?: number;
        points?: Point[];
      };
    }
  | {
      mode: "resize";
      elementId: string;
      handle: ResizeHandle;
      startScreen: Point;
      orig: { x: number; y: number; w: number; h: number };
    }
  | {
      mode: "endpoint";
      elementId: string;
      which: EndpointHandle;
      // untuk panah: geser salah satu titik ujung
    }
  | {
      mode: "create-shape";
      elementId: string;
      startWorld: Point;
      // untuk rect/ellipse: drag dari sudut
    }
  | {
      mode: "create-arrow";
      elementId: string;
      startWorld: Point;
      // untuk panah baru: drag dari titik awal ke titik akhir
    }
  | {
      mode: "create-draw";
      elementId: string;
      // untuk freehand: kumpulkan titik saat pointer move
    };

// -------------------------------------------------------------------------
// 7. SAVE / EXPORT
// -------------------------------------------------------------------------
// Bentuk data yang dipersist ke localStorage atau di-export ke JSON.
// -------------------------------------------------------------------------
export interface SavedBoard {
  title: string;
  elements: BoardElement[];
  view: ViewState;
  /** timestamp (ms) — hanya untuk localStorage */
  ts?: number;
}

// -------------------------------------------------------------------------
// 8. DIALOG
// -------------------------------------------------------------------------
export interface DialogContent {
  title: string;
  /** HTML string (boleh berisi <kbd>, <b>, dll.) */
  html: string;
}

export type DistributivePartial<T> = T extends unknown ? Partial<T> : never;
export type BoardElementPatch = DistributivePartial<BoardElement>;

export type SelectionMode = "replace" | "toggle" | "add";
