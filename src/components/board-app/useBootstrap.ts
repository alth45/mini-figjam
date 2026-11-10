// =========================================================================
// src/components/board-app/useBootstrap.ts
// Effect sekali-jalan saat mount:
//   - Load dari localStorage jika ada
//   - Atau seed content baru + simpan
// Semua Date & storage call di dalam effect → aman dari prerender.
// =========================================================================

"use client";

import { useEffect } from "react";
import { DEFAULT_VIEW } from "@/lib/constants";
import {
  buildSeedContent,
  loadFromStorage,
  saveToStorage,
} from "@/lib/storage";
import { setSaveState } from "@/lib/save-store";
import type { SavedBoard, ViewState } from "@/lib/types";

interface UseBootstrapOptions {
  loadBoard: (board: SavedBoard) => void;
  setView: (view: ViewState) => void;
}

export function useBootstrap({ loadBoard, setView }: UseBootstrapOptions) {
  useEffect(() => {
    const loaded = loadFromStorage();

    if (loaded) {
      loadBoard({
        title: loaded.title,
        elements: loaded.elements,
        view: loaded.view,
      });
      setView(loaded.view);
      setSaveState({
        status: "saved",
        savedAt: loaded.ts ? new Date(loaded.ts) : null,
      });
    } else {
      const seed = buildSeedContent();
      loadBoard({
        title: seed.title,
        elements: seed.elements,
        view: DEFAULT_VIEW,
      });
      setView(DEFAULT_VIEW);
      saveToStorage({
        title: seed.title,
        elements: seed.elements,
        view: DEFAULT_VIEW,
      });
      setSaveState({ status: "saved", savedAt: new Date() });
    }
  }, [loadBoard, setView]);
}
