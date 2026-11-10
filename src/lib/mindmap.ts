// =========================================================================
// src/lib/mindmap.ts
// Helper untuk mind map: layout node, relasi parent-child, warna per depth.
// =========================================================================

import type { BoardElement, MindNodeElement } from "./types";
import { MIND_NODE, MIND_NODE_COLORS } from "./constants";

export function colorForDepth(depth: number): string {
  return MIND_NODE_COLORS[Math.min(depth, MIND_NODE_COLORS.length - 1)];
}

export function getMindNodes(elements: BoardElement[]): MindNodeElement[] {
  return elements.filter((el): el is MindNodeElement => el.type === "mindnode");
}

export function getChildrenOf(
  parentId: string,
  elements: BoardElement[],
): MindNodeElement[] {
  return elements.filter(
    (el): el is MindNodeElement =>
      el.type === "mindnode" && el.parentId === parentId,
  );
}

/** Semua descendant (BFS) — untuk cascade delete & reposition. */
export function getDescendantsOf(
  parentId: string,
  elements: BoardElement[],
): MindNodeElement[] {
  const result: MindNodeElement[] = [];
  const queue = [parentId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const el of elements) {
      if (el.type === "mindnode" && el.parentId === id) {
        result.push(el);
        queue.push(el.id);
      }
    }
  }
  return result;
}

export function createRootMindNode(
  x: number,
  y: number,
  id: string,
): MindNodeElement {
  return {
    id,
    type: "mindnode",
    x: x - MIND_NODE.rootWidth / 2,
    y: y - MIND_NODE.rootHeight / 2,
    w: MIND_NODE.rootWidth,
    h: MIND_NODE.rootHeight,
    text: "Ide Utama",
    color: colorForDepth(0),
    parentId: null,
    depth: 0,
  };
}

export function createChildMindNode(
  parent: MindNodeElement,
  siblings: MindNodeElement[],
  id: string,
): MindNodeElement {
  const depth = parent.depth + 1;
  const x = parent.x + parent.w + MIND_NODE.gap;

  let y: number;
  if (siblings.length === 0) {
    // Anak pertama: sejajarkan tengah dengan parent
    y = parent.y + parent.h / 2 - MIND_NODE.height / 2;
  } else {
    // Anak berikutnya: di bawah saudara terendah
    const lowest = siblings.reduce((a, b) => (a.y > b.y ? a : b));
    y = lowest.y + lowest.h + MIND_NODE.vgap;
  }

  return {
    id,
    type: "mindnode",
    x,
    y,
    w: MIND_NODE.width,
    h: MIND_NODE.height,
    text: "",
    color: colorForDepth(depth),
    parentId: parent.id,
    depth,
  };
}

export function createSiblingMindNode(
  node: MindNodeElement,
  siblings: MindNodeElement[],
  parent: MindNodeElement | null,
  id: string,
): MindNodeElement | null {
  // Root tidak punya sibling (MVP: satu root per pohon)
  if (!parent) return null;

  const x = node.x;
  const lowest =
    siblings.length > 0 ? siblings.reduce((a, b) => (a.y > b.y ? a : b)) : node;
  const y = lowest.y + lowest.h + MIND_NODE.vgap;

  return {
    id,
    type: "mindnode",
    x,
    y,
    w: MIND_NODE.width,
    h: MIND_NODE.height,
    text: "",
    color: colorForDepth(node.depth),
    parentId: parent.id,
    depth: node.depth,
  };
}

export function getMindNodesBounds(
  nodes: MindNodeElement[],
): { x: number; y: number; w: number; h: number } | null {
  if (nodes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + n.w > maxX) maxX = n.x + n.w;
    if (n.y + n.h > maxY) maxY = n.y + n.h;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
