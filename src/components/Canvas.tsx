// =========================================================================
// src/components/Canvas.tsx
// Orchestrator tipis. Semua logika interaksi dipindahkan ke ./canvas/*.
// File ini murni: sambungkan hook, komposisi render.
// =========================================================================

"use client";

import { useRef, useState } from "react";
import { GRID } from "@/lib/constants";
import { ElementRenderer } from "./ElementRenderer";
import { SelectionOverlay } from "./SelectionOverlay";
import type { CanvasProps, DragState, MarqueeRect } from "./canvas/types";
import { getCursorFor } from "./canvas/helpers";
import { useCanvasRefs } from "./canvas/useCanvasRefs";
import { usePointerHandlers } from "./canvas/usePointerHandlers";
import { useWheelHandler } from "./canvas/useWheelHandler";
import { usePointerDown } from "./canvas/usePointerDown";
import { useDoubleClick } from "./canvas/useDoubleClick";
import { MindLinks } from "./canvas/MindLinks";
import { Marquee } from "./canvas/Marquee";

export function Canvas(props: CanvasProps) {
  const {
    elements,
    selectedIds,
    editingId,
    tool,
    spaceHeld,
    gridVisible,
    canvasRef,
    canvasView,
    selectElement,
    selectMany,
    addElement,
    updateElement,
    updateMany,
    deleteElement,
    startEdit,
    commitEdit,
    snapshot,
    setTool,
    getElement,
  } = props;

  const [dragMode, setDragMode] = useState<DragState["mode"] | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // --- Sinkronisasi ref ke state terbaru ---
  const { boardRef, viewRef } = useCanvasRefs(
    {
      elements,
      selectedIds,
      selectElement,
      selectMany,
      addElement,
      updateElement,
      updateMany,
      deleteElement,
      startEdit,
      commitEdit,
      snapshot,
      setTool,
      getElement,
    },
    canvasView,
  );

  // --- Event handlers ---
  usePointerHandlers({
    boardRef,
    viewRef,
    dragRef,
    setDragMode,
    setMarqueeRect,
  });

  useWheelHandler(canvasRef, viewRef);

  const handlePointerDown = usePointerDown({
    tool,
    spaceHeld,
    elements,
    selectedIds,
    selectElement,
    selectMany,
    addElement,
    updateElement,
    updateMany,
    deleteElement,
    startEdit,
    commitEdit,
    snapshot,
    setTool,
    getElement,
    viewRef,
    dragRef,
    setDragMode,
  });

  const handleDoubleClick = useDoubleClick(
    tool,
    getElement,
    selectElement,
    startEdit,
  );

  // --- Render ---
  const cursor = getCursorFor(tool, spaceHeld, dragMode);
  const { view } = canvasView;
  const selectedElements = elements.filter((el) => selectedIds.includes(el.id));

  return (
    <div
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      style={{ cursor }}
      className="absolute inset-0 overflow-hidden touch-none select-none"
    >
      <div
        className="canvas-grid"
        data-hidden={!gridVisible}
        style={
          {
            "--grid-size": `${GRID.size * view.zoom}px`,
            "--grid-x": `${view.x}px`,
            "--grid-y": `${view.y}px`,
          } as React.CSSProperties
        }
      />

      <div
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
        }}
      >
        <MindLinks elements={elements} />
        {elements.map((el) => (
          <ElementRenderer
            key={el.id}
            element={el}
            isEditing={el.id === editingId}
            onCommitEdit={commitEdit}
          />
        ))}
      </div>

      <SelectionOverlay
        elements={selectedElements}
        isEditing={editingId !== null}
        view={view}
      />

      <Marquee rect={marqueeRect} />
    </div>
  );
}
