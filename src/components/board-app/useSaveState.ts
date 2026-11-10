// =========================================================================
// src/components/board-app/useSaveState.ts
// Wrapper tipis untuk external save store.
// Status simpan (saved/saving/error + savedAt) datang dari sini.
// =========================================================================

"use client";

import { useSyncExternalStore } from "react";
import {
  getSaveSnapshot,
  getSaveServerSnapshot,
  subscribeSaveStore,
} from "@/lib/save-store";

export function useSaveState() {
  return useSyncExternalStore(
    subscribeSaveStore,
    getSaveSnapshot,
    getSaveServerSnapshot,
  );
}
