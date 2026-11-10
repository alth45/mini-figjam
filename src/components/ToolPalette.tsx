// =========================================================================
// src/components/ToolPalette.tsx
// Palet tool vertikal di kiri-tengah workspace.
// =========================================================================

"use client";

import {
  ArrowUpRight,
  Circle,
  Eraser,
  Hand,
  MousePointer2,
  Pencil,
  Square,
  StickyNote,
  Type,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { Tool } from "@/lib/types";
import { TOOL_LABELS } from "@/lib/constants";

// -------------------------------------------------------------------------
// KONFIGURASI TOMBOL
// -------------------------------------------------------------------------
// Urutan & separator mengikuti figjam.html asli.
// -------------------------------------------------------------------------
interface ToolButton {
  tool: Tool;
  icon: LucideIcon;
  shortcut: string;
}

interface SeparatorItem {
  type: "separator";
}

type PaletteItem = ToolButton | SeparatorItem;

const PALETTE: PaletteItem[] = [
  { tool: "select", icon: MousePointer2, shortcut: "V" },
  { tool: "hand", icon: Hand, shortcut: "H" },
  { type: "separator" },
  { tool: "sticky", icon: StickyNote, shortcut: "S" },
  { tool: "text", icon: Type, shortcut: "T" },
  { tool: "rect", icon: Square, shortcut: "R" },
  { tool: "ellipse", icon: Circle, shortcut: "O" },
  { tool: "arrow", icon: ArrowUpRight, shortcut: "A" },
  { tool: "pen", icon: Pencil, shortcut: "P" },
  { tool: "mindmap", icon: Workflow, shortcut: "M" },
  { type: "separator" },
  { tool: "eraser", icon: Eraser, shortcut: "E" },
];

// -------------------------------------------------------------------------
// PROPS
// -------------------------------------------------------------------------
interface ToolPaletteProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
}

// -------------------------------------------------------------------------
// COMPONENT
// -------------------------------------------------------------------------
export function ToolPalette({ activeTool, onToolChange }: ToolPaletteProps) {
  return (
    <div
      className="absolute left-3.5 top-1/2 z-30 -translate-y-1/2 flex flex-col gap-0.5 rounded-[14px] border border-border bg-panel p-2 shadow-md"
      role="toolbar"
      aria-label="Alat kanvas"
      aria-orientation="vertical"
    >
      {PALETTE.map((item, i) => {
        if ("type" in item && item.type === "separator") {
          return (
            <div
              key={`sep-${i}`}
              className="my-1 mx-1.5 h-px bg-border"
              role="separator"
            />
          );
        }

        const btn = item as ToolButton;
        const isActive = activeTool === btn.tool;
        const Icon = btn.icon;
        const label = TOOL_LABELS[btn.tool];

        return (
          <button
            key={btn.tool}
            type="button"
            onClick={() => onToolChange(btn.tool)}
            title={`${label} (${btn.shortcut})`}
            aria-label={`${label} (${btn.shortcut})`}
            aria-pressed={isActive}
            data-tool={btn.tool}
            className={[
              "relative flex h-9 w-9 items-center justify-center rounded-lg",
              "transition-colors duration-100",
              isActive
                ? "bg-accent text-white shadow-[0_2px_8px_rgba(124,58,237,0.35)]"
                : "text-gray-600 hover:bg-gray-100 hover:text-ink",
            ].join(" ")}
          >
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
