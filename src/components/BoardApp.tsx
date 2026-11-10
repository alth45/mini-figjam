"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore, // ← FIX #2: external store
} from "react";
import type { Tool } from "@/lib/types";
import type { BoardAction } from "@/lib/actions";
import { DEFAULT_VIEW } from "@/lib/constants";
import {
  buildSeedContent,
  exportBoardAsJson,
  loadFromStorage,
  saveToStorage,
} from "@/lib/storage";
import {
  getSaveSnapshot,
  getSaveServerSnapshot,
  setSaveState,
  subscribeSaveStore,
} from "@/lib/save-store"; // ← FIX #2
import { useBoardState } from "@/hooks/useBoardState";
import { useCanvasView } from "@/hooks/useCanvasView";
import { TopBar } from "./TopBar";
import { Canvas } from "./Canvas";
import { ToolPalette } from "./ToolPalette";
import { ZoomControls } from "./ZoomControls";
import { FloatToolbar } from "./FloatToolbar";
import { StatusBar } from "./StatusBar";
import { InfoDialog } from "./InfoDialog";
import {
  createChildMindNode,
  createSiblingMindNode,
  getChildrenOf,
} from "@/lib/mindmap";
import { generateId } from "@/lib/storage";

const SAVE_DEBOUNCE_MS = 1500;

export function BoardApp() {
  const board = useBoardState();
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasView = useCanvasView(canvasRef);

  const [tool, setTool] = useState<Tool>("select");
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [dialog, setDialog] = useState<{ title: string; html: string } | null>(
    null,
  );

  // ← FIX #2: saveStatus & savedAt dari external store
  const saveState = useSyncExternalStore(
    subscribeSaveStore,
    getSaveSnapshot,
    getSaveServerSnapshot,
  );

  // ← FIX #1: ref TIDAK di-write saat render. Tulis di effect.
  const refsRef = useRef({ board, canvasView, tool, dialog });
  useEffect(() => {
    refsRef.current = { board, canvasView, tool, dialog };
  }); // no deps — sync setiap render, tidak trigger re-render

  // =======================================================================
  // BOOTSTRAP — load from storage. Tidak ada setState, hanya store update.
  // =======================================================================
  useEffect(() => {
    const loaded = loadFromStorage();

    if (loaded) {
      board.loadBoard({
        title: loaded.title,
        elements: loaded.elements,
        view: loaded.view,
      });
      canvasView.setView(loaded.view);
      // ← FIX #2: pakai store, bukan setState
      setSaveState({
        status: "saved",
        savedAt: loaded.ts ? new Date(loaded.ts) : null,
      });
    } else {
      const seed = buildSeedContent();
      board.loadBoard({
        title: seed.title,
        elements: seed.elements,
        view: DEFAULT_VIEW,
      });
      canvasView.setView(DEFAULT_VIEW);
      saveToStorage({
        title: seed.title,
        elements: seed.elements,
        view: DEFAULT_VIEW,
      });
      setSaveState({ status: "saved", savedAt: new Date() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =======================================================================
  // AUTOSAVE — debounced. Store-based, tanpa setState di effect.
  // =======================================================================
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!board.dirty) return;

    // ← FIX #3: setSaveState bukan setState React — boleh di effect
    setSaveState({ status: "saving" });
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
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
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    board.dirty,
    board.title,
    board.elements,
    canvasView.view,
    board.markSaved,
  ]);

  // =======================================================================
  // BEFOREUNLOAD
  // =======================================================================
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveTimeoutRef.current) {
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

  // =======================================================================
  // HANDLE ACTION — semua setSaveStatus/setSavedAt diganti setSaveState
  // =======================================================================
  const handleAction = useCallback((a: BoardAction) => {
    const b = refsRef.current.board;
    const cv = refsRef.current.canvasView;

    switch (a) {
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
        saveToStorage({ title: b.title, elements: b.elements, view: cv.view });
        setSaveState({ status: "saved", savedAt: new Date() });
        setDialog({
          title: "Papan Siap Dibagikan",
          html:
            "<p>Papan sudah disimpan di peramban Anda.</p>" +
            '<p style="color:#6b7280;font-size:12px;">Data disimpan di <code>localStorage</code>.</p>',
        });
        return;
      }
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
      case "shortcut":
        setDialog({
          title: "Pintasan Papan Ketik",
          html:
            "<p><kbd>V</kbd> pilih · <kbd>H</kbd> geser · <kbd>S</kbd> sticky · <kbd>T</kbd> teks</p>" +
            "<p><kbd>R</kbd> persegi · <kbd>O</kbd> elips · <kbd>A</kbd> panah · <kbd>P</kbd> pen · <kbd>E</kbd> penghapus</p>" +
            "<p><kbd>Del</kbd> hapus · <kbd>Ctrl+D</kbd> duplikat · <kbd>Ctrl+Z</kbd> undo · <kbd>Ctrl+Y</kbd> redo</p>" +
            "<p><kbd>Space</kbd> geser papan · <kbd>Ctrl+Scroll</kbd> zoom</p>",
        });
        return;
      case "about":
        setDialog({
          title: "Tentang Mini FigJam",
          html:
            "<p><b>Mini FigJam</b> — papan kolaborasi sederhana.</p>" +
            "<p>Sticky, teks, bentuk, panah, gambar bebas, pan/zoom, undo/redo, autosave, ekspor JSON.</p>",
        });
        return;
      case "insert-mindmap":
        setTool("mindmap");
        return;

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
        const sib = createSiblingMindNode(sel, siblings, parent, generateId());
        if (!sib) return;
        b.addElement(sib);
        b.selectElement(sib.id);
        b.snapshot();
        setTimeout(() => b.startEdit(sib.id), 30);
        return;
      }
    }
  }, []);

  // =======================================================================
  // KEYBOARD SHORTCUTS — sama persis, tidak berubah
  // =======================================================================
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

      if (d) {
        if (e.key === "Escape") {
          setDialog(null);
          e.preventDefault();
        }
        return;
      }

      if (e.code === "Space" && !inField) setSpaceHeld(true);

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

      // Tab/Enter khusus untuk mindnode yang sedang diedit
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

      if (e.shiftKey && e.key === "1") {
        e.preventDefault();
        handleAction("zoom-fit");
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (b.selectedId) {
          e.preventDefault();
          b.deleteSelected();
          return;
        }
      }

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

      // Arrow nudge untuk semua elemen terpilih
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
          // Setelah arrow & draw di-eliminasi, semua tipe sisa
          // (sticky/text/rect/ellipse/mindnode) punya x/y → BoxElement
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
  }, [handleAction]);

  // =======================================================================
  // RENDER — StatusBar sekarang terima saveState dari external store
  // =======================================================================
  return (
    <div className="flex h-screen flex-col bg-canvas">
      <TopBar
        title={board.title}
        onTitleChange={board.setTitle}
        canUndo={board.canUndo}
        canRedo={board.canRedo}
        onAction={handleAction}
      />

      <div className="relative flex-1 overflow-hidden">
        <Canvas
          elements={board.elements}
          selectedIds={board.selectedIds} // ← baru
          editingId={board.editingId}
          tool={tool}
          spaceHeld={spaceHeld}
          gridVisible={gridVisible}
          canvasRef={canvasRef}
          canvasView={canvasView}
          selectElement={board.selectElement}
          selectMany={board.selectMany} // ← baru
          addElement={board.addElement}
          updateElement={board.updateElement}
          updateMany={board.updateMany} // ← baru
          deleteElement={board.deleteElement}
          startEdit={board.startEdit}
          commitEdit={board.commitEdit}
          snapshot={board.snapshot}
          setTool={setTool}
          getElement={board.getElement}
        />

        <ToolPalette activeTool={tool} onToolChange={setTool} />

        <ZoomControls
          zoom={canvasView.view.zoom}
          onZoomIn={canvasView.zoomIn}
          onZoomOut={canvasView.zoomOut}
          onReset={canvasView.resetZoom}
        />

        <FloatToolbar
          elements={board.selectedElements}
          isEditing={board.editingId !== null}
          view={canvasView.view}
          canvasRef={canvasRef}
          onUpdate={board.updateElement}
          onDelete={board.deleteSelected}
          onSnapshot={board.snapshot}
        />
      </div>

      <StatusBar
        saveStatus={saveState.status}
        savedAt={saveState.savedAt}
        currentTool={tool}
        elementCount={board.elements.length}
        zoom={canvasView.view.zoom}
        selectedElements={board.selectedElements}
      />

      <InfoDialog
        title={dialog?.title ?? null}
        html={dialog?.html ?? ""}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
