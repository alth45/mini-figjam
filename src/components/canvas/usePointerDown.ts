// =========================================================================
// src/components/canvas/usePointerDown.ts
// Handler pointerdown: mulai pan / select / move / resize / marquee /
// eraser / create (sticky, text, shape, arrow, pen, ink, mindmap).
// =========================================================================

"use client";

import { useCallback, type RefObject } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { BoardElement } from "@/lib/types";
import { DEFAULTS } from "@/lib/constants";
import { generateId } from "@/lib/storage";
import {
  createChildMindNode,
  createRootMindNode,
  getChildrenOf,
} from "@/lib/mindmap";
import type { UseCanvasViewReturn } from "@/hooks/useCanvasView";
import type { CanvasBoardActions, CanvasProps, DragState } from "./types";
import { isBoxElement } from "./helpers";

interface Options extends CanvasBoardActions {
  tool: CanvasProps["tool"];
  spaceHeld: boolean;
  viewRef: RefObject<UseCanvasViewReturn>;
  dragRef: RefObject<DragState | null>;
  setDragMode: (m: DragState["mode"] | null) => void;
}

export function usePointerDown(opts: Options) {
  const {
    tool,
    spaceHeld,
    elements,
    selectedIds,
    getElement,
    selectElement,
    deleteElement,
    snapshot,
    addElement,
    setTool,
    startEdit,
    viewRef,
    dragRef,
    setDragMode,
  } = opts;

  return useCallback(
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

        // (b) elemen diklik
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

      // ---- PEN / INK ----
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
      viewRef,
      dragRef,
      setDragMode,
    ],
  );
}
