"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { BoardElement, Point, Tool } from "@/lib/types";
import { DEFAULTS, GRID, ZOOM_LIMITS } from "@/lib/constants";
import { generateId } from "@/lib/storage";
import { getElementBounds } from "@/lib/bounds";
import {
  createChildMindNode,
  createRootMindNode,
  getChildrenOf,
  getMindNodes,
  getMindNodesBounds,
} from "@/lib/mindmap";
import { ElementRenderer } from "./ElementRenderer";
import { SelectionOverlay } from "./SelectionOverlay";
import type { UseCanvasViewReturn } from "@/hooks/useCanvasView";

// =========================================================================
// TYPES
// =========================================================================
interface CanvasProps {
  elements: BoardElement[];
  selectedIds: string[];
  editingId: string | null;
  tool: Tool;
  spaceHeld: boolean;
  gridVisible: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  canvasView: UseCanvasViewReturn;
  selectElement: (
    id: string | null,
    mode?: "replace" | "toggle" | "add",
  ) => void;
  selectMany: (ids: string[]) => void;
  addElement: (el: BoardElement) => void;
  updateElement: (id: string, patch: Partial<BoardElement>) => void;
  updateMany: (updates: { id: string; patch: Partial<BoardElement> }[]) => void;
  deleteElement: (id: string) => void;
  startEdit: (id: string) => void;
  commitEdit: (id: string, text: string) => void;
  snapshot: () => void;
  setTool: (t: Tool) => void;
  getElement: (id: string) => BoardElement | undefined;
}

type DragState =
  | {
      mode: "pan";
      pointerId: number;
      startScreen: Point;
      startViewX: number;
      startViewY: number;
      startZoom: number;
    }
  | {
      mode: "move";
      pointerId: number;
      startScreen: Point;
      startZoom: number;
      origs: BoardElement[];
    }
  | {
      mode: "resize";
      pointerId: number;
      elementId: string;
      handle: "nw" | "ne" | "sw" | "se";
      startScreen: Point;
      startZoom: number;
      orig: { x: number; y: number; w: number; h: number };
    }
  | {
      mode: "endpoint";
      pointerId: number;
      elementId: string;
      which: "start" | "end";
    }
  | {
      mode: "create-shape";
      pointerId: number;
      elementId: string;
      startScreen: Point;
      startWorld: Point;
      startViewX: number;
      startViewY: number;
      startZoom: number;
    }
  | {
      mode: "create-arrow";
      pointerId: number;
      elementId: string;
      startScreen: Point;
      startWorld: Point;
      startViewX: number;
      startViewY: number;
      startZoom: number;
    }
  | {
      mode: "create-draw";
      pointerId: number;
      elementId: string;
      lastScreen: Point;
      lastTime: number;
      points: import("@/lib/types").DrawPoint[]; // ← ganti Point[] → DrawPoint[]
    }
  | {
      mode: "marquee";
      pointerId: number;
      startScreen: Point;
      additive: boolean;
      baseSelection: string[];
    };

// =========================================================================
// HELPERS
// =========================================================================
function getCursorFor(
  tool: Tool,
  spaceHeld: boolean,
  dragMode: DragState["mode"] | null,
): string {
  if (dragMode === "pan") return "grabbing";
  if (dragMode === "move") return "move";
  if (dragMode === "marquee") return "crosshair";
  if (
    dragMode === "create-shape" ||
    dragMode === "create-arrow" ||
    dragMode === "create-draw"
  )
    return "crosshair";
  if (dragMode === "resize" || dragMode === "endpoint") return "nwse-resize";
  if (spaceHeld) return "grab";
  if (tool === "hand") return "grab";
  if (tool === "text" || tool === "sticky") return "cell";
  if (tool === "eraser") return "not-allowed";
  if (tool === "mindmap") return "copy";
  if (tool === "select") return "default";
  return "crosshair";
}

function isBoxElement(
  el: BoardElement,
): el is Extract<BoardElement, { w: number; h: number }> {
  return "x" in el && "y" in el && "w" in el && "h" in el;
}

// Bounding-rect intersection test (world coords)
function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(
    a.x + a.w < b.x ||
    a.x > b.x + b.w ||
    a.y + a.h < b.y ||
    a.y > b.y + b.h
  );
}

// =========================================================================
// COMPONENT
// =========================================================================
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
  const [marqueeRect, setMarqueeRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Ref berisi state terbaru agar handler global selalu membaca nilai fresh.
  const boardRef = useRef({
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
  });
  useEffect(() => {
    boardRef.current = {
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
    };
  });

  const viewRef = useRef(canvasView);
  useEffect(() => {
    viewRef.current = canvasView;
  });

  const selectedElements = elements.filter((el) => selectedIds.includes(el.id));

  // -------------------------------------------------------------------
  // Global pointer handlers
  // -------------------------------------------------------------------
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      const cv = viewRef.current;
      const b = boardRef.current;
      const pos = cv.getCanvasPos(e);

      switch (drag.mode) {
        case "pan": {
          cv.setView({
            x: drag.startViewX + (pos.x - drag.startScreen.x),
            y: drag.startViewY + (pos.y - drag.startScreen.y),
            zoom: drag.startZoom,
          });
          return;
        }

        case "move": {
          const dx = (pos.x - drag.startScreen.x) / drag.startZoom;
          const dy = (pos.y - drag.startScreen.y) / drag.startZoom;
          const updates = drag.origs.map((o) => {
            if (o.type === "arrow") {
              return {
                id: o.id,
                patch: {
                  x1: o.x1 + dx,
                  y1: o.y1 + dy,
                  x2: o.x2 + dx,
                  y2: o.y2 + dy,
                },
              };
            }
            if (o.type === "draw") {
              return {
                id: o.id,
                patch: {
                  points: o.points.map((p) => ({
                    x: p.x + dx,
                    y: p.y + dy,
                  })),
                },
              };
            }
            // Setelah arrow & draw di-handle, o adalah BoxElement (sticky/text/rect/ellipse/mindnode)
            return { id: o.id, patch: { x: o.x + dx, y: o.y + dy } };
          });
          b.updateMany(updates);
          return;
        }

        case "resize": {
          const dx = (pos.x - drag.startScreen.x) / drag.startZoom;
          const dy = (pos.y - drag.startScreen.y) / drag.startZoom;
          const o = drag.orig;
          let x = o.x;
          let y = o.y;
          let w = o.w;
          let h = o.h;
          if (drag.handle.includes("w")) {
            x = o.x + dx;
            w = o.w - dx;
          }
          if (drag.handle.includes("e")) w = o.w + dx;
          if (drag.handle.includes("n")) {
            y = o.y + dy;
            h = o.h - dy;
          }
          if (drag.handle.includes("s")) h = o.h + dy;
          const MIN = 20;
          if (w < MIN) {
            w = MIN;
            if (drag.handle.includes("w")) x = o.x + o.w - MIN;
          }
          if (h < MIN) {
            h = MIN;
            if (drag.handle.includes("n")) y = o.y + o.h - MIN;
          }
          b.updateElement(drag.elementId, { x, y, w, h });
          return;
        }

        case "endpoint": {
          const wx = (pos.x - cv.view.x) / cv.view.zoom;
          const wy = (pos.y - cv.view.y) / cv.view.zoom;
          if (drag.which === "start") {
            b.updateElement(drag.elementId, { x1: wx, y1: wy });
          } else {
            b.updateElement(drag.elementId, { x2: wx, y2: wy });
          }
          return;
        }

        case "create-shape": {
          const wx = (pos.x - drag.startViewX) / drag.startZoom;
          const wy = (pos.y - drag.startViewY) / drag.startZoom;
          b.updateElement(drag.elementId, {
            x: Math.min(drag.startWorld.x, wx),
            y: Math.min(drag.startWorld.y, wy),
            w: Math.max(20, Math.abs(wx - drag.startWorld.x)),
            h: Math.max(20, Math.abs(wy - drag.startWorld.y)),
          });
          return;
        }

        case "create-arrow": {
          const wx = (pos.x - drag.startViewX) / drag.startZoom;
          const wy = (pos.y - drag.startViewY) / drag.startZoom;
          b.updateElement(drag.elementId, { x2: wx, y2: wy });
          return;
        }

        case "create-draw": {
          const dist = Math.hypot(
            pos.x - drag.lastScreen.x,
            pos.y - drag.lastScreen.y,
          );
          if (dist < DEFAULTS.draw.minDistance) return;

          const now = performance.now();
          const dt = Math.max(1, now - drag.lastTime);
          const speed = dist / dt; // px per ms

          const wx = (pos.x - cv.view.x) / cv.view.zoom;
          const wy = (pos.y - cv.view.y) / cv.view.zoom;
          drag.lastScreen = pos;
          drag.lastTime = now;

          const point: import("@/lib/types").DrawPoint = { x: wx, y: wy };

          // Hanya untuk mode ink: hitung lebar dari kecepatan
          const el = b.getElement(drag.elementId);
          if (el?.type === "draw" && el.mode === "ink") {
            // Cepat → tipis, lambat → tebal. Clamp 0.35 – 1.3.
            const widthMul = Math.max(0.35, Math.min(1.3, 1.3 - speed * 0.6));
            point.w = widthMul;
          }

          drag.points.push(point);
          b.updateElement(drag.elementId, { points: [...drag.points] });
          return;
        }

        case "marquee": {
          const dist = Math.hypot(
            pos.x - drag.startScreen.x,
            pos.y - drag.startScreen.y,
          );
          if (dist < 4) return;

          const x = Math.min(drag.startScreen.x, pos.x);
          const y = Math.min(drag.startScreen.y, pos.y);
          const w = Math.abs(pos.x - drag.startScreen.x);
          const h = Math.abs(pos.y - drag.startScreen.y);
          setMarqueeRect({ x, y, w, h });

          const wx1 = (x - cv.view.x) / cv.view.zoom;
          const wy1 = (y - cv.view.y) / cv.view.zoom;
          const wx2 = (x + w - cv.view.x) / cv.view.zoom;
          const wy2 = (y + h - cv.view.y) / cv.view.zoom;
          const rect = { x: wx1, y: wy1, w: wx2 - wx1, h: wy2 - wy1 };

          const hits = b.elements
            .filter((el) => rectsIntersect(getElementBounds(el), rect))
            .map((el) => el.id);

          const finalIds = drag.additive
            ? Array.from(new Set([...drag.baseSelection, ...hits]))
            : hits;
          b.selectMany(finalIds);
          return;
        }
      }
    };

    const handleUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      const b = boardRef.current;
      const cv = viewRef.current;
      const pos = cv.getCanvasPos(e);

      dragRef.current = null;
      setDragMode(null);

      switch (drag.mode) {
        case "pan":
          return;

        case "move":
        case "resize":
        case "endpoint":
          b.snapshot();
          return;

        case "marquee": {
          const dist = Math.hypot(
            pos.x - drag.startScreen.x,
            pos.y - drag.startScreen.y,
          );
          setMarqueeRect(null);
          if (dist < 4 && !drag.additive) {
            b.selectElement(null);
          }
          return;
        }

        case "create-shape": {
          const el = b.getElement(drag.elementId);
          if (el && (el.type === "rect" || el.type === "ellipse")) {
            if (el.w < 8 && el.h < 8) {
              b.deleteElement(el.id);
            } else {
              b.selectElement(el.id);
              b.snapshot();
            }
          }
          b.setTool("select");
          return;
        }

        case "create-arrow": {
          const el = b.getElement(drag.elementId);
          if (el && el.type === "arrow") {
            const len = Math.hypot(el.x2 - el.x1, el.y2 - el.y1);
            if (len < DEFAULTS.arrow.minLength) {
              b.deleteElement(el.id);
            } else {
              b.selectElement(el.id);
              b.snapshot();
            }
          }
          b.setTool("select");
          return;
        }

        case "create-draw": {
          if (drag.points.length < DEFAULTS.draw.minPoints) {
            b.deleteElement(drag.elementId);
          } else {
            b.selectElement(drag.elementId);
            b.snapshot();
          }
          b.setTool("select");
          return;
        }
      }
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("pointercancel", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("pointercancel", handleUp);
    };
  }, []);

  // -------------------------------------------------------------------
  // Wheel
  // -------------------------------------------------------------------
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (
        (e.target as HTMLElement | null)?.closest?.('[contenteditable="true"]')
      )
        return;
      e.preventDefault();
      const cv = viewRef.current;
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        cv.zoomAt(
          e.deltaY < 0 ? ZOOM_LIMITS.wheelIn : ZOOM_LIMITS.wheelOut,
          sx,
          sy,
        );
      } else {
        cv.setView({
          x: cv.view.x - e.deltaX,
          y: cv.view.y - e.deltaY,
          zoom: cv.view.zoom,
        });
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [canvasRef]);

  // -------------------------------------------------------------------
  // Pointer down
  // -------------------------------------------------------------------
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button === 2) return;
      if (
        (e.target as HTMLElement | null)?.closest?.('[contenteditable="true"]')
      )
        return;

      const cv = viewRef.current;
      const pos = cv.getCanvasPos(e);

      // ---- PAN ----
      if (e.button === 1 || spaceHeld || tool === "hand") {
        e.preventDefault();
        dragRef.current = {
          mode: "pan",
          pointerId: e.pointerId,
          startScreen: pos,
          startViewX: cv.view.x,
          startViewY: cv.view.y,
          startZoom: cv.view.zoom,
        };
        setDragMode("pan");
        return;
      }

      // ---- SELECT ----
      if (tool === "select") {
        // (a) handle resize/endpoint
        const handleEl = (e.target as HTMLElement | null)?.closest?.(
          "[data-handle]",
        ) as HTMLElement | null;
        if (handleEl && selectedIds.length === 1) {
          const handle = handleEl.dataset.handle!;
          const el = getElement(selectedIds[0]);
          if (!el) return;
          if (handle === "start" || handle === "end") {
            dragRef.current = {
              mode: "endpoint",
              pointerId: e.pointerId,
              elementId: el.id,
              which: handle as "start" | "end",
            };
            setDragMode("endpoint");
          } else if (isBoxElement(el)) {
            dragRef.current = {
              mode: "resize",
              pointerId: e.pointerId,
              elementId: el.id,
              handle: handle as "nw" | "ne" | "sw" | "se",
              startScreen: pos,
              startZoom: cv.view.zoom,
              orig: { x: el.x, y: el.y, w: el.w, h: el.h },
            };
            setDragMode("resize");
          }
          e.preventDefault();
          return;
        }

        // (b) elemen diklik?
        const elEl = (e.target as HTMLElement | null)?.closest?.(
          "[data-id]",
        ) as HTMLElement | null;
        if (elEl) {
          const id = elEl.dataset.id!;
          const el = getElement(id);
          if (!el) return;

          const additive = e.shiftKey;
          let idsToDrag: string[];

          if (additive) {
            selectElement(id, "toggle");
            const alreadyIn = selectedIds.includes(id);
            idsToDrag = alreadyIn
              ? selectedIds.filter((x) => x !== id)
              : [...selectedIds, id];
          } else if (!selectedIds.includes(id)) {
            selectElement(id, "replace");
            idsToDrag = [id];
          } else {
            idsToDrag = selectedIds;
          }

          const origs = idsToDrag
            .map((x) => getElement(x))
            .filter((x): x is BoardElement => !!x)
            .map((x) => JSON.parse(JSON.stringify(x)) as BoardElement);

          if (origs.length > 0) {
            dragRef.current = {
              mode: "move",
              pointerId: e.pointerId,
              startScreen: pos,
              startZoom: cv.view.zoom,
              origs,
            };
            setDragMode("move");
          }
          e.preventDefault();
          return;
        }

        // (c) area kosong → marquee
        dragRef.current = {
          mode: "marquee",
          pointerId: e.pointerId,
          startScreen: pos,
          additive: e.shiftKey,
          baseSelection: e.shiftKey ? [...selectedIds] : [],
        };
        setDragMode("marquee");
        e.preventDefault();
        return;
      }

      // ---- ERASER ----
      if (tool === "eraser") {
        const elEl = (e.target as HTMLElement | null)?.closest?.(
          "[data-id]",
        ) as HTMLElement | null;
        if (elEl) {
          deleteElement(elEl.dataset.id!);
          snapshot();
        }
        return;
      }

      const wx = (pos.x - cv.view.x) / cv.view.zoom;
      const wy = (pos.y - cv.view.y) / cv.view.zoom;

      // ---- MINDMAP ----
      if (tool === "mindmap") {
        const elEl = (e.target as HTMLElement | null)?.closest?.(
          "[data-id]",
        ) as HTMLElement | null;
        if (elEl) {
          const parent = getElement(elEl.dataset.id!);
          if (parent?.type === "mindnode") {
            const siblings = getChildrenOf(parent.id, elements);
            const child = createChildMindNode(parent, siblings, generateId());
            addElement(child);
            selectElement(child.id);
            setTool("select");
            snapshot();
            setTimeout(() => startEdit(child.id), 30);
            return;
          }
        }
        const root = createRootMindNode(wx, wy, generateId());
        addElement(root);
        selectElement(root.id);
        setTool("select");
        snapshot();
        setTimeout(() => startEdit(root.id), 30);
        return;
      }

      // ---- STICKY ----
      if (tool === "sticky") {
        const size = DEFAULTS.sticky.size;
        const el: BoardElement = {
          id: generateId(),
          type: "sticky",
          x: wx - size / 2,
          y: wy - size / 2,
          w: size,
          h: size,
          color: DEFAULTS.sticky.color,
          text: "",
        };
        addElement(el);
        selectElement(el.id);
        setTool("select");
        snapshot();
        setTimeout(() => startEdit(el.id), 30);
        return;
      }

      // ---- TEXT ----
      if (tool === "text") {
        const el: BoardElement = {
          id: generateId(),
          type: "text",
          x: wx,
          y: wy,
          w: DEFAULTS.text.width,
          h: DEFAULTS.text.height,
          text: "",
          fontSize: DEFAULTS.text.fontSize,
          color: DEFAULTS.text.color,
          bold: DEFAULTS.text.bold,
          align: DEFAULTS.text.align,
        };
        addElement(el);
        selectElement(el.id);
        setTool("select");
        snapshot();
        setTimeout(() => startEdit(el.id), 30);
        return;
      }

      // ---- RECT / ELLIPSE ----
      if (tool === "rect" || tool === "ellipse") {
        const el: BoardElement = {
          id: generateId(),
          type: tool,
          x: wx,
          y: wy,
          w: 1,
          h: 1,
          fill: DEFAULTS[tool].fill,
        };
        addElement(el);
        selectElement(el.id);
        dragRef.current = {
          mode: "create-shape",
          pointerId: e.pointerId,
          elementId: el.id,
          startScreen: pos,
          startWorld: { x: wx, y: wy },
          startViewX: cv.view.x,
          startViewY: cv.view.y,
          startZoom: cv.view.zoom,
        };
        setDragMode("create-shape");
        e.preventDefault();
        return;
      }

      // ---- ARROW ----
      if (tool === "arrow") {
        const el: BoardElement = {
          id: generateId(),
          type: "arrow",
          x1: wx,
          y1: wy,
          x2: wx,
          y2: wy,
          color: DEFAULTS.arrow.color,
          strokeWidth: DEFAULTS.arrow.strokeWidth,
        };
        addElement(el);
        selectElement(el.id);
        dragRef.current = {
          mode: "create-arrow",
          pointerId: e.pointerId,
          elementId: el.id,
          startScreen: pos,
          startWorld: { x: wx, y: wy },
          startViewX: cv.view.x,
          startViewY: cv.view.y,
          startZoom: cv.view.zoom,
        };
        setDragMode("create-arrow");
        e.preventDefault();
        return;
      }

      // ---- PEN ----
      if (tool === "pen" || tool === "ink") {
        const isInk = tool === "ink";
        const el: BoardElement = {
          id: generateId(),
          type: "draw",
          points: [{ x: wx, y: wy, w: 1.0 }],
          color: DEFAULTS.draw.color,
          strokeWidth: isInk
            ? DEFAULTS.draw.inkStrokeWidth
            : DEFAULTS.draw.strokeWidth,
          mode: isInk ? "ink" : "pen",
        };
        addElement(el);
        selectElement(el.id);
        dragRef.current = {
          mode: "create-draw",
          pointerId: e.pointerId,
          elementId: el.id,
          lastScreen: pos,
          lastTime: performance.now(),
          points: [{ x: wx, y: wy, w: 1.0 }],
        };
        setDragMode("create-draw");
        e.preventDefault();
        return;
      }
    },
    [
      tool,
      spaceHeld,
      selectedIds,
      elements,
      getElement,
      selectElement,
      deleteElement,
      snapshot,
      addElement,
      setTool,
      startEdit,
    ],
  );

  // -------------------------------------------------------------------
  // Double-click
  // -------------------------------------------------------------------
  const handleDoubleClick = useCallback(
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

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  const cursor = getCursorFor(tool, spaceHeld, dragMode);
  const { view } = canvasView;

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

      {marqueeRect && (
        <div
          className="absolute border border-accent bg-accent/10 pointer-events-none"
          style={{
            left: marqueeRect.x,
            top: marqueeRect.y,
            width: marqueeRect.w,
            height: marqueeRect.h,
          }}
        />
      )}
    </div>
  );
}

// =========================================================================
// MIND LINKS
// =========================================================================
function MindLinks({ elements }: { elements: BoardElement[] }) {
  const nodes = getMindNodes(elements);
  const bounds = getMindNodesBounds(nodes);
  if (!bounds || nodes.length === 0) return null;
  const PAD = 100;
  const svgX = bounds.x - PAD;
  const svgY = bounds.y - PAD;
  const svgW = bounds.w + PAD * 2;
  const svgH = bounds.h + PAD * 2;
  return (
    <svg
      style={{
        position: "absolute",
        left: svgX,
        top: svgY,
        width: svgW,
        height: svgH,
        overflow: "visible",
        pointerEvents: "none",
      }}
      viewBox={`${svgX} ${svgY} ${svgW} ${svgH}`}
    >
      {nodes
        .filter((n) => n.parentId)
        .map((node) => {
          const parent = nodes.find((p) => p.id === node.parentId);
          if (!parent) return null;
          const fromX = parent.x + parent.w;
          const fromY = parent.y + parent.h / 2;
          const toX = node.x;
          const toY = node.y + node.h / 2;
          const cp = Math.max(Math.abs(toX - fromX) * 0.4, 40);
          const d = `M ${fromX} ${fromY} C ${fromX + cp} ${fromY}, ${toX - cp} ${toY}, ${toX} ${toY}`;
          return (
            <path
              key={node.id}
              d={d}
              stroke={node.color}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
    </svg>
  );
}
