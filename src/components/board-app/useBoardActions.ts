// =========================================================================
// src/components/board-app/useBoardActions.ts
// handleAction — switch utama untuk semua BoardAction
// (menu, tombol, keyboard shortcut).
//
// Membaca state terbaru via refsRef agar callback stabil ([] deps),
// sehingga useKeyboardShortcuts tidak perlu re-attach listener.
// =========================================================================

"use client";

import { useCallback } from "react";
import type { RefObject } from "react";
import type { BoardAction } from "@/lib/actions";
import type { Tool } from "@/lib/types";
import { DEFAULT_VIEW } from "@/lib/constants";
import {
  buildSeedContent,
  exportBoardAsJson,
  generateId,
  saveToStorage,
} from "@/lib/storage";
import { setSaveState } from "@/lib/save-store";
import {
  createChildMindNode,
  createSiblingMindNode,
  getChildrenOf,
} from "@/lib/mindmap";
import type { BoardRefsShape } from "./useBoardRefs";
import type { BoardDialog } from "./types";

interface UseBoardActionsOptions {
  refsRef: RefObject<BoardRefsShape>;
  setTool: (t: Tool) => void;
  setDialog: (d: BoardDialog | null) => void;
  setGridVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useBoardActions({
  refsRef,
  setTool,
  setDialog,
  setGridVisible,
}: UseBoardActionsOptions) {
  return useCallback(
    (a: BoardAction) => {
      const b = refsRef.current.board;
      const cv = refsRef.current.canvasView;

      switch (a) {
        // ----- File -----
        case "new": {
          if (b.dirty && !confirm("Papan belum disimpan. Buat baru?")) return;
          const seed = buildSeedContent();
          b.loadBoard({
            title: seed.title,
            elements: seed.elements,
            view: DEFAULT_VIEW,
          });
          cv.setView(DEFAULT_VIEW);
          saveToStorage({
            title: seed.title,
            elements: seed.elements,
            view: DEFAULT_VIEW,
          });
          setSaveState({ status: "saved", savedAt: new Date() });
          return;
        }

        case "save": {
          const ok = saveToStorage({
            title: b.title,
            elements: b.elements,
            view: cv.view,
          });
          if (ok) {
            setSaveState({ status: "saved", savedAt: new Date() });
            b.markSaved();
          } else {
            setSaveState({ status: "error" });
          }
          return;
        }

        case "export": {
          const name = exportBoardAsJson(b.title, b.elements, cv.view);
          setDialog({
            title: name ? "Ekspor Berhasil" : "Ekspor Gagal",
            html: name
              ? `<p>File <code>${name}</code> telah diunduh.</p>`
              : "<p>Tidak dapat membuat file JSON.</p>",
          });
          return;
        }

        case "clear":
          if (!confirm("Kosongkan seluruh papan?")) return;
          b.clearAll();
          return;

        case "share": {
          saveToStorage({
            title: b.title,
            elements: b.elements,
            view: cv.view,
          });
          setSaveState({ status: "saved", savedAt: new Date() });
          setDialog({
            title: "Papan Siap Dibagikan",
            html:
              "<p>Papan sudah disimpan di peramban Anda.</p>" +
              '<p style="color:#6b7280;font-size:12px;">Data disimpan di <code>localStorage</code>.</p>',
          });
          return;
        }

        // ----- Edit -----
        case "undo":
          b.undo();
          return;
        case "redo":
          b.redo();
          return;
        case "duplicate":
          b.duplicateSelected();
          return;
        case "delete":
          b.deleteSelected();
          return;
        case "front":
          b.bringFront();
          return;
        case "back":
          b.sendBack();
          return;

        // ----- View -----
        case "zoom-in":
          cv.zoomIn();
          return;
        case "zoom-out":
          cv.zoomOut();
          return;
        case "zoom-100":
          cv.resetZoom();
          return;
        case "zoom-fit":
          cv.zoomFit(b.elements);
          return;
        case "toggle-grid":
          setGridVisible((v) => !v);
          return;

        // ----- Insert -----
        case "insert-sticky":
          setTool("sticky");
          return;
        case "insert-text":
          setTool("text");
          return;
        case "insert-rect":
          setTool("rect");
          return;
        case "insert-ellipse":
          setTool("ellipse");
          return;
        case "insert-arrow":
          setTool("arrow");
          return;
        case "insert-pen":
          setTool("pen");
          return;
        case "insert-ink":
          setTool("ink");
          return;
        case "insert-mindmap":
          setTool("mindmap");
          return;

        // ----- Mindmap -----
        case "mindmap-add-child": {
          const sel = b.selectedElement;
          if (sel?.type !== "mindnode") return;
          const siblings = getChildrenOf(sel.id, b.elements);
          const child = createChildMindNode(sel, siblings, generateId());
          b.addElement(child);
          b.selectElement(child.id);
          b.snapshot();
          setTimeout(() => b.startEdit(child.id), 30);
          return;
        }

        case "mindmap-add-sibling": {
          const sel = b.selectedElement;
          if (sel?.type !== "mindnode" || !sel.parentId) return;
          const parent = b.getElement(sel.parentId);
          if (parent?.type !== "mindnode") return;
          const siblings = getChildrenOf(parent.id, b.elements);
          const sib = createSiblingMindNode(
            sel,
            siblings,
            parent,
            generateId(),
          );
          if (!sib) return;
          b.addElement(sib);
          b.selectElement(sib.id);
          b.snapshot();
          setTimeout(() => b.startEdit(sib.id), 30);
          return;
        }

        // ----- Help -----
        case "shortcut":
          setDialog({
            title: "Pintasan Papan Ketik",
            html:
              "<p><kbd>V</kbd> pilih · <kbd>H</kbd> geser · <kbd>S</kbd> sticky · <kbd>T</kbd> teks</p>" +
              "<p><kbd>R</kbd> persegi · <kbd>O</kbd> elips · <kbd>A</kbd> panah · <kbd>P</kbd> pen · <kbd>I</kbd> tinta · <kbd>E</kbd> penghapus</p>" +
              "<p><kbd>Del</kbd> hapus · <kbd>Ctrl+D</kbd> duplikat · <kbd>Ctrl+Z</kbd> undo · <kbd>Ctrl+Y</kbd> redo</p>" +
              "<p><kbd>Ctrl+A</kbd> pilih semua · <kbd>Space</kbd> geser papan · <kbd>Ctrl+Scroll</kbd> zoom</p>",
          });
          return;

        case "about":
          setDialog({
            title: "Tentang Mini FigJam",
            html:
              "<p><b>Mini FigJam</b> — papan kolaborasi sederhana.</p>" +
              "<p>Sticky, teks, bentuk, panah, tinta, mind map, pan/zoom, undo/redo, autosave, ekspor JSON.</p>",
          });
          return;
      }
    },
    [refsRef, setTool, setDialog, setGridVisible],
  );
}
