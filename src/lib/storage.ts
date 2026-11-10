// =========================================================================
// src/lib/storage.ts
// Helper persistensi: localStorage, export JSON, dan seed content.
// =========================================================================

import { STORAGE_KEY, DEFAULT_TITLE, DEFAULT_VIEW } from "./constants";
import type { BoardElement, SavedBoard, ViewState } from "./types";

// -------------------------------------------------------------------------
// 1. ID GENERATOR
// -------------------------------------------------------------------------
// Sebelumnya memakai counter global (uidCounter). Di React, kita tidak
// boleh menyimpan counter sebagai variabel module-level karena bisa
// bentrok saat hot reload / SSR. Kita pakai crypto.randomUUID() yang
// tersedia di semua browser modern (dan Node 20+), dengan fallback acak
// berbasis Math.random untuk keamanan ekstra.
// -------------------------------------------------------------------------

export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return "e_" + crypto.randomUUID().slice(0, 8);
  }
  return "e_" + Math.random().toString(36).slice(2, 10);
}

// -------------------------------------------------------------------------
// 2. LOCALSTORAGE
// -------------------------------------------------------------------------
// localStorage tidak tersedia di server. Semua fungsi di bawah harus
// dipanggil dari client component / useEffect.
// -------------------------------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Simpan board ke localStorage. Mengembalikan true jika berhasil.
 * Tidak melempar error — kegagalan (quota penuh, mode private, dll.)
 * hanya di-log & mengembalikan false.
 */
export function saveToStorage(board: SavedBoard): boolean {
  if (!isBrowser()) return false;
  try {
    const payload: SavedBoard = {
      title: board.title || DEFAULT_TITLE,
      elements: board.elements,
      view: board.view ?? DEFAULT_VIEW,
      ts: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error("[storage] gagal menyimpan:", err);
    return false;
  }
}

/**
 * Muat board dari localStorage.
 * Mengembalikan `null` jika tidak ada data / data rusak / SSR.
 * Melakukan validasi minimal agar data korup tidak crash aplikasi.
 */
export function loadFromStorage(): SavedBoard | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;

    // Validasi bentuk minimal
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as SavedBoard).elements)
    ) {
      return null;
    }

    const obj = parsed as SavedBoard;
    return {
      title: typeof obj.title === "string" ? obj.title : DEFAULT_TITLE,
      elements: obj.elements,
      view: isValidView(obj.view) ? obj.view : { ...DEFAULT_VIEW },
      ts: typeof obj.ts === "number" ? obj.ts : undefined,
    };
  } catch (err) {
    console.error("[storage] gagal memuat:", err);
    return null;
  }
}

/** Hapus data tersimpan (dipakai oleh menu "Kosongkan Papan" jika perlu). */
export function clearStorage(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("[storage] gagal menghapus:", err);
  }
}

function isValidView(v: unknown): v is ViewState {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.x === "number" &&
    typeof obj.y === "number" &&
    typeof obj.zoom === "number"
  );
}

// -------------------------------------------------------------------------
// 3. EXPORT JSON
// -------------------------------------------------------------------------
// Membuat file .json yang bisa diunduh user. Hanya berjalan di client.
// -------------------------------------------------------------------------

/**
 * Export board sebagai file JSON yang diunduh browser.
 * @returns nama file yang dipakai, atau null jika gagal.
 */
export function exportBoardAsJson(
  title: string,
  elements: BoardElement[],
  view: ViewState,
): string | null {
  if (!isBrowser()) return null;

  const payload: SavedBoard = {
    title: title || DEFAULT_TITLE,
    elements,
    view,
  };

  const safeName = (title || "papan").replace(/[^\w\-]+/g, "_") || "papan";
  const fileName = `${safeName}.json`;

  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return fileName;
  } catch (err) {
    console.error("[storage] gagal export:", err);
    return null;
  }
}

// -------------------------------------------------------------------------
// 4. SEED CONTENT
// -------------------------------------------------------------------------
// Konten awal yang muncul saat pertama kali membuka aplikasi.
// Struktur identik dengan `seedContent()` di figjam.html.
// -------------------------------------------------------------------------
// =========================================================================
// src/lib/storage.ts (potongan yang diganti)
// =========================================================================

export function buildSeedContent(): {
  title: string;
  elements: BoardElement[];
} {
  const elements: BoardElement[] = [];

  // --- Judul besar ---
  elements.push({
    id: "seed-title",
    type: "text",
    x: 80,
    y: 60,
    w: 700,
    h: 80,
    text: "Brainstorm Ide Produk Baru 🚀",
    fontSize: 44,
    color: "#1e1e1e",
    bold: true,
    align: "left",
  });

  // --- Sticky notes ---
  const stickies: Array<{ x: number; y: number; color: string; text: string }> =
    [
      { x: 80, y: 200, color: "#FFE066", text: "Fitur kolaborasi real-time" },
      { x: 290, y: 200, color: "#A2D2FF", text: "Integrasi dengan kalender" },
      { x: 500, y: 200, color: "#FFAFCC", text: "Mode offline & sinkronisasi" },
      { x: 80, y: 410, color: "#B2F2BB", text: "Tema gelap & aksesibilitas" },
      { x: 290, y: 410, color: "#D0BFFF", text: "Ekspor ke PDF & gambar" },
      { x: 500, y: 410, color: "#FFD8A8", text: "Template siap pakai" },
    ];

  stickies.forEach((s, i) => {
    elements.push({
      id: `seed-sticky-${i + 1}`,
      type: "sticky",
      x: s.x,
      y: s.y,
      w: 180,
      h: 180,
      color: s.color,
      text: s.text,
    });
  });

  // --- Panah judul → sticky ---
  elements.push({
    id: "seed-arrow",
    type: "arrow",
    x1: 400,
    y1: 145,
    x2: 400,
    y2: 190,
    color: "#7C3AED",
    strokeWidth: 2.5,
  });

  // --- Hint text ---
  elements.push({
    id: "seed-hint",
    type: "text",
    x: 80,
    y: 620,
    w: 700,
    h: 40,
    text: "Klik dua kali untuk edit · Seret untuk pindah · Tarik sudut untuk ubah ukuran",
    fontSize: 14,
    color: "#6b7280",
    bold: false,
    align: "left",
  });

  // --- Contoh mind map di kanan ---
  // Seed IDs sengaja hardcoded & deterministik agar Next.js bisa
  // mem-prerender komponen tanpa "unstable value" warning.
  elements.push(
    {
      id: "seed-mind-root",
      type: "mindnode",
      x: 900,
      y: 200,
      w: 220,
      h: 64,
      text: "Mind Map Demo",
      color: "#7C3AED",
      parentId: null,
      depth: 0,
    },
    {
      id: "seed-mind-1",
      type: "mindnode",
      x: 1200,
      y: 190,
      w: 180,
      h: 52,
      text: "Riset Pengguna",
      color: "#0D99FF",
      parentId: "seed-mind-root",
      depth: 1,
    },
    {
      id: "seed-mind-2",
      type: "mindnode",
      x: 1200,
      y: 260,
      w: 180,
      h: 52,
      text: "Wireframe",
      color: "#0D99FF",
      parentId: "seed-mind-root",
      depth: 1,
    },
    {
      id: "seed-mind-1a",
      type: "mindnode",
      x: 1460,
      y: 190,
      w: 180,
      h: 52,
      text: "Wawancara",
      color: "#22C55E",
      parentId: "seed-mind-1",
      depth: 2,
    },
    {
      id: "seed-mind-1b",
      type: "mindnode",
      x: 1460,
      y: 260,
      w: 180,
      h: 52,
      text: "Survei",
      color: "#22C55E",
      parentId: "seed-mind-1",
      depth: 2,
    },
  );

  return {
    title: "Papan Tanpa Judul",
    elements,
  };
}
