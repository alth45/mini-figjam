// =========================================================================
// src/components/board-app/useAutoSave.ts
// Debounced autosave + flush synchronous saat beforeunload.
// Menggunakan external save store (bukan setState React) agar
// tidak melanggar aturan React 19.
// =========================================================================

"use client";

import { useEffect, useRef } from "react";
import { saveToStorage } from "@/lib/storage";
import { setSaveState } from "@/lib/save-store";
import type { UseBoardStateReturn } from "@/hooks/useBoardState";
import type { UseCanvasViewReturn } from "@/hooks/useCanvasView";

const SAVE_DEBOUNCE_MS = 1500;

export function useAutoSave(
  board: UseBoardStateReturn,
  canvasView: UseCanvasViewReturn,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Debounced save saat ada perubahan ---
  useEffect(() => {
    if (!board.dirty) return;
    setSaveState({ status: "saving" });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      const ok = saveToStorage({
        title: board.title,
        elements: board.elements,
        view: canvasView.view,
      });
      if (ok) {
        setSaveState({ status: "saved", savedAt: new Date() });
        board.markSaved();
      } else {
        setSaveState({ status: "error" });
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [
    board.dirty,
    board.title,
    board.elements,
    canvasView.view,
    board.markSaved,
  ]);

  // --- Flush pending save sebelum halaman ditutup ---
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (timeoutRef.current) {
        saveToStorage({
          title: board.title,
          elements: board.elements,
          view: canvasView.view,
        });
      }
      if (board.dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [board.dirty, board.title, board.elements, canvasView.view]);
}
