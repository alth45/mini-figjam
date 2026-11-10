// =========================================================================
// src/lib/constants.ts
// Semua nilai konstan untuk board. Tidak ada state di sini — murni data
// statis yang dipakai lintas komponen.
// =========================================================================

import type { Tool, ViewState } from "./types";

// -------------------------------------------------------------------------
// 1. PALET WARNA
// -------------------------------------------------------------------------
// Disalin persis dari figjam.html agar hasil visual identik.
// -------------------------------------------------------------------------

/** Warna sticky note. */
export const STICKY_COLORS = [
  "#FFE066",
  "#FFAFCC",
  "#A2D2FF",
  "#B2F2BB",
  "#D0BFFF",
  "#FFD8A8",
  "#C7F9CC",
  "#FFC6FF",
  "#E2E8F0",
] as const;

/** Warna fill untuk rect/ellipse. */
export const SHAPE_COLORS = [
  "#A2D2FF",
  "#B2F2BB",
  "#FFD8A8",
  "#D0BFFF",
  "#FFAFCC",
  "#FFE066",
  "#C7F9CC",
  "#E2E8F0",
  "#1e1e1e",
] as const;

/** Warna teks (termasuk teks bebas). */
export const TEXT_COLORS = [
  "#1e1e1e",
  "#7C3AED",
  "#0D99FF",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#6b7280",
] as const;

/** Warna stroke untuk panah & goresan bebas. */
export const STROKE_COLORS = [
  "#1e1e1e",
  "#7C3AED",
  "#0D99FF",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#6b7280",
] as const;

// Warna per kedalaman mind node
export const MIND_NODE_COLORS = [
  "#7C3AED", // 0: root — ungu
  "#0D99FF", // 1: biru
  "#22C55E", // 2: hijau
  "#F59E0B", // 3: amber
  "#EC4899", // 4: pink
  "#6B7280", // 5+: abu
] as const;

export const MIND_NODE = {
  width: 180,
  height: 52,
  rootWidth: 220,
  rootHeight: 64,
  gap: 80, // jarak horizontal parent → child
  vgap: 16, // jarak vertikal antar-sibling
} as const;

// -------------------------------------------------------------------------
// 2. DEFAULT ELEMEN BARU
// -------------------------------------------------------------------------
// Dipakai saat user memilih tool "sticky", "text", dll. lalu klik kanvas.
// -------------------------------------------------------------------------

export const DEFAULTS = {
  sticky: {
    size: 180,
    color: STICKY_COLORS[0],
    text: "",
  },
  text: {
    width: 240,
    height: 60,
    fontSize: 24,
    color: "#1e1e1e",
    bold: false,
    align: "left" as const,
    text: "",
  },
  rect: {
    fill: SHAPE_COLORS[0],
    minSize: 20,
  },
  ellipse: {
    fill: SHAPE_COLORS[0],
    minSize: 20,
  },
  arrow: {
    color: "#1e1e1e",
    strokeWidth: 2.5,
    minLength: 12, // di bawah ini panah dibatalkan saat dibuat
  },
  draw: {
    color: "#1e1e1e",
    strokeWidth: 3,
    minPoints: 2, // di bawah ini goresan dibatalkan
    minDistance: 2, // jarak minimum (px) antar titik agar tidak spam
  },
  /** Jarak offset saat duplikasi (Ctrl+D). */
  duplicateOffset: 24,
} as const;

// -------------------------------------------------------------------------
// 3. VIEW & ZOOM
// -------------------------------------------------------------------------

export const DEFAULT_VIEW: ViewState = { x: 120, y: 80, zoom: 1 };

export const ZOOM_LIMITS = {
  min: 0.1,
  max: 4,
  /** Step tombol zoom in / out. */
  inFactor: 1.25,
  outFactor: 0.8,
  /** Faktor untuk Ctrl+Scroll. */
  wheelIn: 1.1,
  wheelOut: 0.9,
} as const;

/** Padding (px) saat Zoom-to-Fit (Shift+1). */
export const ZOOM_FIT_PADDING = 80;

// -------------------------------------------------------------------------
// 4. GRID
// -------------------------------------------------------------------------

export const GRID = {
  /** Ukuran sel grid dalam world units. */
  size: 20,
  /** Warna titik grid (dipakai di globals.css sebagai CSS var juga). */
  dotColor: "#cfd3da",
} as const;

// -------------------------------------------------------------------------
// 5. RENDERING PANAH
// -------------------------------------------------------------------------
// Parameter kepala panah. Dipakai di ElementRenderer.
// -------------------------------------------------------------------------

export const ARROW_HEAD = {
  /** Panjang garis kepala panah (px). */
  length: 14,
  /** Sudut antara garis panah & tiap sisi kepala (radian). */
  angle: 0.42,
  /** Lebar area hit (transparent) untuk memudahkan klik panah. */
  hitWidth: 18,
} as const;

/** Lebar hit area (transparent) untuk goresan bebas. */
export const DRAW_HIT_WIDTH = 18;

// -------------------------------------------------------------------------
// 6. LABEL TOOL (Bahasa Indonesia)
// -------------------------------------------------------------------------

export const TOOL_LABELS: Record<Tool, string> = {
  select: "Pilih",
  hand: "Geser",
  sticky: "Sticky",
  text: "Teks",
  rect: "Persegi",
  ellipse: "Elips",
  arrow: "Panah",
  pen: "Gambar",
  eraser: "Penghapus",
  mindmap: "Mind Map",
};

/** Label tipe elemen untuk status bar. */
export const ELEMENT_LABELS: Record<string, string> = {
  sticky: "Sticky",
  text: "Teks",
  rect: "Persegi",
  ellipse: "Elips",
  arrow: "Panah",
  draw: "Goresan",
  mindnode: "Node",
};

/** Judul default papan baru. */
export const DEFAULT_TITLE = "Papan Tanpa Judul";

// -------------------------------------------------------------------------
// 7. STORAGE
// -------------------------------------------------------------------------

export const STORAGE_KEY = "minifigjam_v1";

/** Interval autosave ke localStorage (ms). */
export const AUTOSAVE_INTERVAL_MS = 6000;

// -------------------------------------------------------------------------
// 8. HISTORY (undo/redo)
// -------------------------------------------------------------------------

export const HISTORY = {
  /** Batas maksimum snapshot yang disimpan. */
  limit: 100,
} as const;

// -------------------------------------------------------------------------
// 9. DESAIN TOKEN (referensi dari HTML asli)
// -------------------------------------------------------------------------
// Karena kita pakai Tailwind, nilai ini juga didefinisikan sebagai CSS
// variable di globals.css. Diekspor di sini agar komponen yang butuh
// nilai warna (misal SVG stroke dinamis) tidak hardcode.
// -------------------------------------------------------------------------

export const ACCENT = {
  primary: "#7C3AED",
  primaryHover: "#6d28d9",
  soft: "#ede9fe",
  blue: "#0D99FF",
} as const;

export const UI_COLORS = {
  border: "#e2e5ea",
  borderStrong: "#c9ced6",
  text: "#1e1e1e",
  muted: "#6b7280",
  bgCanvas: "#f3f4f6",
  bgPanel: "#ffffff",
} as const;

// -------------------------------------------------------------------------
// 10. CSS VARIABLES UNTUK GRID
// -------------------------------------------------------------------------
// Dipakai Canvas.tsx untuk mengatur background grid secara dinamis
// mengikuti zoom & pan.
// -------------------------------------------------------------------------
export const GRID_CSS_VARS = {
  sizeVar: "--grid-size",
  posXVar: "--grid-x",
  posYVar: "--grid-y",
} as const;
