// =========================================================================
// src/lib/actions.ts
// Daftar aksi global yang bisa dipicu dari TopBar, keyboard shortcut,
// atau tombol mana pun di aplikasi.
//
// Semua aksi ditangani satu tempat: `handleAction` di BoardApp.tsx
// via switch-exhaustive (TypeScript akan error jika ada case yang
// belum ditangani ketika menambah variant baru).
// =========================================================================

export type BoardAction =
  // ----- File -----
  | "new"
  | "save"
  | "export"
  | "clear"
  | "share"

  // ----- Edit -----
  | "undo"
  | "redo"
  | "duplicate"
  | "delete"
  | "front"
  | "back"

  // ----- View -----
  | "zoom-in"
  | "zoom-out"
  | "zoom-100"
  | "zoom-fit"
  | "toggle-grid"

  // ----- Insert -----
  | "insert-sticky"
  | "insert-text"
  | "insert-rect"
  | "insert-ellipse"
  | "insert-arrow"
  | "insert-pen"

  // ----- Help -----
  | "shortcut"
  | "about"
  //-----Mind map----
  | "insert-mindmap"
  | "mindmap-add-child"
  | "mindmap-add-sibling"
  | "insert-pen"
  | "insert-ink"; 
