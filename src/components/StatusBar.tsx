"use client";

import { useSyncExternalStore } from "react"; // ← FIX: ganti useState+useEffect
import type { BoardElement, Tool } from "@/lib/types";
import { ELEMENT_LABELS, TOOL_LABELS } from "@/lib/constants";
import { getElementBounds } from "@/lib/bounds";

// -------------------------------------------------------------------------
// useMounted — deteksi client tanpa setState-in-effect
// -------------------------------------------------------------------------
// useSyncExternalStore memakai:
//   - getServerSnapshot selama SSR DAN saat hydration  → false
//   - getSnapshot setelah hydration selesai            → true
//
// Jadi HTML server dan render pertama client identik (false), baru setelah
// hydration benar-benar selesai React switch ke snapshot client (true).
// Tidak ada setState, tidak ada cascading render.
// -------------------------------------------------------------------------
const emptySubscribe = () => () => {};

function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // client snapshot
    () => false, // server snapshot (dipakai juga saat hydration)
  );
}

export type SaveStatus = "saved" | "saving" | "error";

interface StatusBarProps {
  saveStatus: SaveStatus;
  savedAt: Date | null;
  currentTool: Tool;
  elementCount: number;
  zoom: number;
  selectedElements: BoardElement[];
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("id-ID");
}

function formatSelection(el: BoardElement): string {
  const label = ELEMENT_LABELS[el.type] ?? el.type;
  const b = getElementBounds(el);
  return `${label} · ${Math.round(b.x)},${Math.round(b.y)} · ${Math.round(
    b.w,
  )}×${Math.round(b.h)}`;
}

export function StatusBar({
  saveStatus,
  savedAt,
  currentTool,
  elementCount,
  zoom,
  selectedElements,
}: StatusBarProps) {
  // ← FIX: pakai useMounted, bukan useState+useEffect
  const mounted = useMounted();

  const saveText =
    saveStatus === "error"
      ? "Gagal menyimpan"
      : saveStatus === "saving"
        ? "Belum disimpan"
        : mounted && savedAt
          ? `Tersimpan ${formatTime(savedAt)}`
          : "Tersimpan";

  const dotClass =
    saveStatus === "saving"
      ? "status-dot saving"
      : saveStatus === "error"
        ? "status-dot error"
        : "status-dot";

  const selectionText =
    selectedElements.length === 0
      ? "Tidak ada seleksi"
      : selectedElements.length === 1
        ? formatSelection(selectedElements[0])
        : `${selectedElements.length} elemen terpilih`;

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      className="flex h-[26px] flex-none select-none items-center justify-between border-t border-border bg-panel px-3.5 text-[11px] text-muted"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-4">
        <span>
          <span className={dotClass} aria-hidden="true" />
          <span suppressHydrationWarning>{saveText}</span>
        </span>
        <span>
          Alat:{" "}
          <b className="font-semibold text-ink">{TOOL_LABELS[currentTool]}</b>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span>
          Elemen: <b className="font-semibold text-ink">{elementCount}</b>
        </span>
        <span>
          Zoom: <b className="font-semibold text-ink">{zoomPercent}%</b>
        </span>
        <span suppressHydrationWarning>{selectionText}</span>
      </div>
    </div>
  );
}
