// =========================================================================
// src/components/BoardApp.tsx
// Orchestrator tipis. Semua logika non-render dipindahkan ke ./board-app/*.
// File ini murni: state UI, panggil hook, lalu render komponen.
// =========================================================================

"use client";

import { useRef, useState } from "react";
import type { Tool } from "@/lib/types";
import { useBoardState } from "@/hooks/useBoardState";
import { useCanvasView } from "@/hooks/useCanvasView";
import { useSaveState } from "./board-app/useSaveState";
import { useBoardRefs } from "./board-app/useBoardRefs";
import { useBootstrap } from "./board-app/useBootstrap";
import { useAutoSave } from "./board-app/useAutoSave";
import { useBoardActions } from "./board-app/useBoardActions";
import { useKeyboardShortcuts } from "./board-app/useKeyboardShortcuts";
import type { BoardDialog } from "./board-app/types";
import { TopBar } from "./TopBar";
import { Canvas } from "./Canvas";
import { ToolPalette } from "./ToolPalette";
import { ZoomControls } from "./ZoomControls";
import { FloatToolbar } from "./FloatToolbar";
import { StatusBar } from "./StatusBar";
import { InfoDialog } from "./InfoDialog";

export function BoardApp() {
  // --- Core hooks ---
  const board = useBoardState();
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasView = useCanvasView(canvasRef);

  // --- UI state ---
  const [tool, setTool] = useState<Tool>("select");
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [dialog, setDialog] = useState<BoardDialog | null>(null);

  // --- External save state (SSR-safe) ---
  const saveState = useSaveState();

  // --- Refs snapshot untuk handler global ---
  const refsRef = useBoardRefs({ board, canvasView, tool, dialog });

  // --- Effects: bootstrap + autosave (bisa dipanggil langsung) ---
  useBootstrap({
    loadBoard: board.loadBoard,
    setView: canvasView.setView,
  });
  useAutoSave(board, canvasView);

  // --- Actions + keyboard (membutuhkan refsRef & setters) ---
  const handleAction = useBoardActions({
    refsRef,
    setTool,
    setDialog,
    setGridVisible,
  });

  useKeyboardShortcuts({
    refsRef,
    handleAction,
    setTool,
    setDialog,
    setSpaceHeld,
  });

  // --- Render ---
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
          selectedIds={board.selectedIds}
          editingId={board.editingId}
          tool={tool}
          spaceHeld={spaceHeld}
          gridVisible={gridVisible}
          canvasRef={canvasRef}
          canvasView={canvasView}
          selectElement={board.selectElement}
          selectMany={board.selectMany}
          addElement={board.addElement}
          updateElement={board.updateElement}
          updateMany={board.updateMany}
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
