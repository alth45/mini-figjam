// =========================================================================
// src/components/canvas/useDoubleClick.ts
// Double-click pada sticky/text/mindnode → mulai mode edit teks.
// =========================================================================

"use client";

import { useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { BoardElement, Tool } from "@/lib/types";

export function useDoubleClick(
  tool: Tool,
  getElement: (id: string) => BoardElement | undefined,
  selectElement: (
    id: string | null,
    mode?: "replace" | "toggle" | "add",
  ) => void,
  startEdit: (id: string) => void,
) {
  return useCallback(
    (e: ReactMouseEvent) => {
      if (tool !== "select") return;
      const elEl = (e.target as HTMLElement | null)?.closest?.(
        "[data-id]",
      ) as HTMLElement | null;
      if (!elEl) return;
      const id = elEl.dataset.id!;
      const el = getElement(id);
      if (!el) return;
      if (
        el.type === "sticky" ||
        el.type === "text" ||
        el.type === "mindnode"
      ) {
        selectElement(id);
        startEdit(id);
      }
    },
    [tool, getElement, selectElement, startEdit],
  );
}
