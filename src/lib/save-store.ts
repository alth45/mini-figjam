// =========================================================================
// src/lib/save-store.ts
// External store untuk save state (saveStatus + savedAt).
//
// Kenapa external store?
// React 19 melarang setState langsung di dalam useEffect karena memicu
// cascading render. Solusi resmi untuk data "external" (status simpan,
// timestamp, dll.) adalah useSyncExternalStore.
//
// Effect hanya boleh MENULIS ke store (setSaveState), bukan ke React state.
// React sendiri yang akan re-render saat subscribe menangkap perubahan.
// =========================================================================

"use client";

export type SaveStatus = "saved" | "saving" | "error";

export interface SaveState {
  status: SaveStatus;
  savedAt: Date | null;
}

// State awal: aman untuk SSR (tidak ada new Date()).
const SERVER_STATE: SaveState = { status: "saved", savedAt: null };

let currentState: SaveState = SERVER_STATE;
const listeners = new Set<() => void>();

/** Snapshot client (dibaca useSyncExternalStore setelah hydration). */
export function getSaveSnapshot(): SaveState {
  return currentState;
}

/**
 * Snapshot server (dipakai saat SSR DAN hydration).
 * Selalu sama dengan state awal → tidak ada mismatch.
 */
export function getSaveServerSnapshot(): SaveState {
  return SERVER_STATE;
}

export function subscribeSaveStore(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Update state + notify React. Dipanggil dari effect / event handler. */
export function setSaveState(partial: Partial<SaveState>): void {
  currentState = { ...currentState, ...partial };
  listeners.forEach((fn) => fn());
}
