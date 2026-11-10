// =========================================================================
// src/components/canvas/MindLinks.tsx
// SVG kurva Bezier dari parent mindnode ke child-nya.
// Di-render di dalam `world` (ikut ter-transformasi dengan pan/zoom).
// =========================================================================

"use client";

import type { BoardElement } from "@/lib/types";
import { getMindNodes, getMindNodesBounds } from "@/lib/mindmap";

export function MindLinks({ elements }: { elements: BoardElement[] }) {
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
