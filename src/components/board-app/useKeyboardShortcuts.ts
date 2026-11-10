// =========================================================================
// src/components/board-app/useKeyboardShortcuts.ts
// Handler keyboard global: tool shortcut, undo/redo, zoom, nudge, dll.
// Semua state dibaca via refsRef agar listener tidak perlu re-attach.
// =========================================================================

"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import type { BoardAction } from "@/lib/actions";
import type { Tool } from "@/lib/types";
import type { BoardRefsShape } from "./useBoardRefs";
import type { BoardDialog } from "./types";

interface UseKeyboardShortcutsOptions {
  refsRef: RefObject<BoardRefsShape>;
  handleAction: (a: BoardAction) => void;
  setTool: (t: Tool) => void;
  setDialog: (d: BoardDialog | null) => void;
  setSpaceHeld: (v: boolean) => void;
}

export function useKeyboardShortcuts({
  refsRef,
  handleAction,
  setTool,
  setDialog,
  setSpaceHeld,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const r = refsRef.current;
      const b = r.board;
      const t = r.tool;
      const d = r.dialog;

      const target = e.target as HTMLElement | null;
      const tag = (target?.tagName ?? "").toUpperCase();
      const inField =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        !!target?.isContentEditable;

      // 1) Dialog intercepts semua key kecuali Escape
      if (d) {
        if (e.key === "Escape") {
          setDialog(null);
          e.preventDefault();
        }
        return;
      }

      // 2) Space held → pan mode
      if (e.code === "Space" && !inField) setSpaceHeld(true);

      // 3) Escape hierarchy
      if (e.key === "Escape") {
        if (b.editingId) return;
        if (b.selectedId) {
          b.deselect();
          e.preventDefault();
          return;
        }
        if (t !== "select") {
          setTool("select");
          e.preventDefault();
          return;
        }
        return;
      }

      // 4) Tab/Enter untuk mindnode yang sedang diedit
      if (b.editingId) {
        const editingEl = b.getElement(b.editingId);
        if (
          editingEl?.type === "mindnode" &&
          (e.key === "Tab" || e.key === "Enter")
        ) {
          e.preventDefault();
          const action =
            e.key === "Tab" ? "mindmap-add-child" : "mindmap-add-sibling";
          (document.activeElement as HTMLElement | null)?.blur();
          setTimeout(() => handleAction(action), 50);
          return;
        }
      }
      if (!b.editingId && b.selectedElement?.type === "mindnode") {
        if (e.key === "Tab") {
          e.preventDefault();
          handleAction("mindmap-add-child");
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          handleAction("mindmap-add-sibling");
          return;
        }
      }

      if (inField) return;

      // 5) Ctrl/Cmd shortcuts
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl) {
        const k = e.key.toLowerCase();
        if (k === "z") {
          e.preventDefault();
          handleAction("undo");
          return;
        }
        if (k === "y") {
          e.preventDefault();
          handleAction("redo");
          return;
        }
        if (k === "m") {
          setTool("mindmap");
          return;
        }
        if (k === "a") {
          e.preventDefault();
          b.selectAll();
          return;
        }
        if (k === "d") {
          e.preventDefault();
          handleAction("duplicate");
          return;
        }
        if (k === "i") {
          setTool("ink");
          return;
        }
        if (k === "s") {
          e.preventDefault();
          handleAction("save");
          return;
        }
        if (k === "0") {
          e.preventDefault();
          handleAction("zoom-100");
          return;
        }
        if (k === "=" || k === "+") {
          e.preventDefault();
          handleAction("zoom-in");
          return;
        }
        if (k === "-") {
          e.preventDefault();
          handleAction("zoom-out");
          return;
        }
        if (k === "]") {
          e.preventDefault();
          handleAction("front");
          return;
        }
        if (k === "[") {
          e.preventDefault();
          handleAction("back");
          return;
        }
        return;
      }

      // 6) Shift+1 zoom fit
      if (e.shiftKey && e.key === "1") {
        e.preventDefault();
        handleAction("zoom-fit");
        return;
      }

      // 7) Delete / Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        if (b.selectedId) {
          e.preventDefault();
          b.deleteSelected();
          return;
        }
      }

      // 8) Tool shortcuts (tanpa modifier)
      const k = e.key.toLowerCase();
      if (k === "v") {
        setTool("select");
        return;
      }
      if (k === "h") {
        setTool("hand");
        return;
      }
      if (k === "s") {
        setTool("sticky");
        return;
      }
      if (k === "t") {
        setTool("text");
        return;
      }
      if (k === "r") {
        setTool("rect");
        return;
      }
      if (k === "o") {
        setTool("ellipse");
        return;
      }
      if (k === "a") {
        setTool("arrow");
        return;
      }
      if (k === "p") {
        setTool("pen");
        return;
      }
      if (k === "e") {
        setTool("eraser");
        return;
      }

      // 9) Arrow nudge (semua terpilih)
      if (b.selectedIds.length > 0 && e.key.startsWith("Arrow")) {
        const step = e.shiftKey ? 10 : 1;
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        if (dx === 0 && dy === 0) return;

        const updates = b.selectedElements.map((el) => {
          if (el.type === "arrow") {
            return {
              id: el.id,
              patch: {
                x1: el.x1 + dx,
                y1: el.y1 + dy,
                x2: el.x2 + dx,
                y2: el.y2 + dy,
              },
            };
          }
          if (el.type === "draw") {
            return {
              id: el.id,
              patch: {
                points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
              },
            };
          }
          // sisa tipe: sticky / text / rect / ellipse / mindnode
          return { id: el.id, patch: { x: el.x + dx, y: el.y + dy } };
        });
        b.updateMany(updates);
        b.snapshot();
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [refsRef, handleAction, setTool, setDialog, setSpaceHeld]);
}
