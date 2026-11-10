// =========================================================================
// src/components/ElementRenderer.tsx
// Merender SATU elemen. Tidak menangani pointer events — itu tugas Canvas.
// =========================================================================

"use client";

import { memo, useEffect, useRef, type KeyboardEvent } from "react";
import type {
  ArrowElement,
  BoardElement,
  DrawElement,
  DrawPoint,
} from "@/lib/types";
import { ARROW_HEAD, DRAW_HIT_WIDTH } from "@/lib/constants";

// -------------------------------------------------------------------------
// PROPS
// -------------------------------------------------------------------------
interface ElementRendererProps {
  element: BoardElement;
  /** True jika elemen ini sedang dalam mode edit teks. */
  isEditing: boolean;
  /** Dipanggil saat blur (edit selesai). */
  onCommitEdit: (id: string, text: string) => void;
}

// -------------------------------------------------------------------------
// KOMPONEN UTAMA
// -------------------------------------------------------------------------
function ElementRendererImpl({
  element,
  isEditing,
  onCommitEdit,
}: ElementRendererProps) {
  const editableRef = useRef<HTMLDivElement>(null);

  // Saat masuk mode edit: focus + pilih semua teks
  useEffect(() => {
    if (!isEditing) return;
    const node = editableRef.current;
    if (!node) return;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [isEditing]);

  const handleBlur = () => {
    if (!isEditing) return;
    onCommitEdit(element.id, editableRef.current?.innerText ?? "");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      // Blur → onBlur → commit
      e.currentTarget.blur();
    }
  };

  // -------------------------------------------------------------------------
  // STICKY
  // -------------------------------------------------------------------------
  if (element.type === "sticky") {
    return (
      <div
        ref={editableRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-id={element.id}
        data-type="sticky"
        className={[
          "absolute rounded-lg p-3.5 text-[15px] leading-[1.35] text-ink",
          "overflow-hidden whitespace-pre-wrap break-words",
          "shadow-[0_2px_6px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.06)]",
          "sticky-editable",
        ].join(" ")}
        style={{
          left: element.x,
          top: element.y,
          width: element.w,
          height: element.h,
          background: element.color,
        }}
      >
        {element.text}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // TEXT
  // -------------------------------------------------------------------------
  if (element.type === "text") {
    return (
      <div
        ref={editableRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-id={element.id}
        data-type="text"
        className="absolute p-1 text-ink overflow-hidden whitespace-pre-wrap break-words text-editable"
        style={{
          left: element.x,
          top: element.y,
          width: element.w,
          height: element.h,
          fontSize: element.fontSize,
          color: element.color,
          fontWeight: element.bold ? 700 : 400,
          textAlign: element.align,
          lineHeight: 1.35,
        }}
      >
        {element.text}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RECT
  // -------------------------------------------------------------------------
  if (element.type === "rect") {
    return (
      <div
        data-id={element.id}
        data-type="rect"
        className="absolute rounded-md overflow-hidden"
        style={{
          left: element.x,
          top: element.y,
          width: element.w,
          height: element.h,
          background: element.fill,
        }}
      />
    );
  }

  // -------------------------------------------------------------------------
  // ELLIPSE
  // -------------------------------------------------------------------------
  if (element.type === "ellipse") {
    return (
      <div
        data-id={element.id}
        data-type="ellipse"
        className="absolute rounded-full overflow-hidden"
        style={{
          left: element.x,
          top: element.y,
          width: element.w,
          height: element.h,
          background: element.fill,
        }}
      />
    );
  }

  if (element.type === "mindnode") {
    return (
      <div
        ref={editableRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-id={element.id}
        data-type="mindnode"
        className={[
          "absolute flex items-center justify-center rounded-lg px-3 py-2",
          "text-center font-semibold text-white",
          "shadow-md cursor-default",
          element.depth === 0 ? "text-[15px]" : "text-[13px]",
          "[&[contenteditable=true]]:cursor-text",
        ].join(" ")}
        style={{
          left: element.x,
          top: element.y,
          width: element.w,
          height: element.h,
          background: element.color,
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          lineHeight: 1.3,
        }}
      >
        {element.text}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // ARROW & DRAW (SVG)
  // -------------------------------------------------------------------------
  if (element.type === "arrow") {
    return <ArrowSvg element={element} />;
  }

  if (element.type === "draw") {
    return <DrawSvg element={element} />;
  }

  return null;
}

export const ElementRenderer = memo(ElementRendererImpl);

// =========================================================================
// ARROW — SVG
// =========================================================================
// Bounding box elemen = min/max dari kedua titik.
// Line & kepala panah digambar di koordinat lokal (relatif ke bbox).
// Line transparan setebal 18px dipakai sebagai hit area (pointer-events:stroke)
// supaya panah mudah diklik meski garisnya tipis.
// =========================================================================
function ArrowSvg({ element }: { element: ArrowElement }) {
  const minX = Math.min(element.x1, element.x2);
  const minY = Math.min(element.y1, element.y2);
  const w = Math.abs(element.x2 - element.x1);
  const h = Math.abs(element.y2 - element.y1);

  const lx1 = element.x1 - minX;
  const ly1 = element.y1 - minY;
  const lx2 = element.x2 - minX;
  const ly2 = element.y2 - minY;

  // Hitung arah kepala panah
  const angle = Math.atan2(ly2 - ly1, lx2 - lx1);
  const { length: hLen, angle: hAng } = ARROW_HEAD;
  const a1 = angle + Math.PI - hAng;
  const a2 = angle + Math.PI + hAng;
  const p1x = lx2 + Math.cos(a1) * hLen;
  const p1y = ly2 + Math.sin(a1) * hLen;
  const p2x = lx2 + Math.cos(a2) * hLen;
  const p2y = ly2 + Math.sin(a2) * hLen;

  // viewBox minimal 1x1 agar tidak error saat panah vertikal/horizontal
  const vbW = Math.max(1, w);
  const vbH = Math.max(1, h);

  return (
    <div
      data-id={element.id}
      data-type="arrow"
      className="absolute"
      style={{
        left: minX,
        top: minY,
        width: vbW,
        height: vbH,
        overflow: "visible",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${vbW} ${vbH}`}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Hit area transparan */}
        <line
          x1={lx1}
          y1={ly1}
          x2={lx2}
          y2={ly2}
          stroke="transparent"
          strokeWidth={ARROW_HEAD.hitWidth}
          style={{ pointerEvents: "stroke" }}
        />
        {/* Garis panah */}
        <line
          x1={lx1}
          y1={ly1}
          x2={lx2}
          y2={ly2}
          stroke={element.color}
          strokeWidth={element.strokeWidth}
          strokeLinecap="round"
          style={{ pointerEvents: "none" }}
        />
        {/* Kepala panah */}
        <path
          d={`M${lx2},${ly2} L${p1x},${p1y} L${p2x},${p2y} Z`}
          fill={element.color}
          style={{ pointerEvents: "none" }}
        />
      </svg>
    </div>
  );
}

// =========================================================================
// DRAW — SVG polyline
// =========================================================================
// Sama seperti arrow: bbox dihitung dari min/max points.
// Path "M x0,y0 L x1,y1 L x2,y2 ..." untuk garis, plus versi transparan
// sebagai hit area.
// =========================================================================
// =========================================================================
// DRAW — dispatcher
// =========================================================================
function DrawSvg({ element }: { element: DrawElement }) {
  const bbox = getDrawBBox(element);
  if (element.mode === "ink") {
    return <DrawInkSvg element={element} bbox={bbox} />;
  }
  return <DrawPenSvg element={element} bbox={bbox} />;
}

interface BBox {
  minX: number;
  minY: number;
  w: number;
  h: number;
}

function getDrawBBox(element: DrawElement): BBox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of element.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}

// =========================================================================
// PEN — lebar seragam (existing behavior)
// =========================================================================
function DrawPenSvg({ element, bbox }: { element: DrawElement; bbox: BBox }) {
  let d = "";
  element.points.forEach((p, i) => {
    const lx = p.x - bbox.minX;
    const ly = p.y - bbox.minY;
    d += `${i === 0 ? "M" : "L"}${lx},${ly}`;
  });
  const vbW = Math.max(1, bbox.w);
  const vbH = Math.max(1, bbox.h);

  return (
    <div
      data-id={element.id}
      data-type="draw"
      className="absolute"
      style={{
        left: bbox.minX,
        top: bbox.minY,
        width: vbW,
        height: vbH,
        overflow: "visible",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${vbW} ${vbH}`}
        style={{ display: "block", overflow: "visible" }}
      >
        <path
          d={d}
          stroke="transparent"
          strokeWidth={DRAW_HIT_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: "stroke" }}
        />
        <path
          d={d}
          stroke={element.color}
          strokeWidth={element.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: "none" }}
        />
      </svg>
    </div>
  );
}

// =========================================================================
// INK — filled polygon dengan lebar variabel
// =========================================================================
function DrawInkSvg({ element, bbox }: { element: DrawElement; bbox: BBox }) {
  const vbW = Math.max(1, bbox.w);
  const vbH = Math.max(1, bbox.h);

  const hitPath = buildHitPath(element.points, bbox.minX, bbox.minY);
  const inkPath = buildInkPath(
    element.points,
    element.strokeWidth,
    bbox.minX,
    bbox.minY,
  );

  return (
    <div
      data-id={element.id}
      data-type="draw"
      className="absolute"
      style={{
        left: bbox.minX,
        top: bbox.minY,
        width: vbW,
        height: vbH,
        overflow: "visible",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${vbW} ${vbH}`}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Hit area transparan */}
        <path
          d={hitPath}
          stroke="transparent"
          strokeWidth={DRAW_HIT_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: "stroke" }}
        />
        {/* Badan tinta: polygon dengan lebar variabel + taper */}
        <path
          d={inkPath}
          fill={element.color}
          style={{ pointerEvents: "none" }}
        />
      </svg>
    </div>
  );
}

/** Centerline untuk hit area. */
function buildHitPath(
  points: DrawPoint[],
  offsetX: number,
  offsetY: number,
): string {
  let d = "";
  points.forEach((p, i) => {
    d += `${i === 0 ? "M" : "L"}${(p.x - offsetX).toFixed(2)},${(
      p.y - offsetY
    ).toFixed(2)}`;
  });
  return d;
}

/**
 * Bangun polygon tertutup yang mengelilingi centerline dengan lebar
 * variabel. Untuk tiap titik:
 *   1. Hitung tangent (arah stroke di titik itu)
 *   2. Hitung perpendicular (tegak lurus)
 *   3. Offset ke kiri & kanan sebesar halfWidth
 *   4. Terapkan taper di ujung & noise organik di sepanjang stroke
 * Lalu trace: kiri maju, kanan mundur, tutup (Z).
 */
function buildInkPath(
  points: DrawPoint[],
  baseWidth: number,
  offsetX: number,
  offsetY: number,
): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) {
    // Single dot (seharusnya tidak terjadi, tapi defensif)
    const r = baseWidth / 2;
    const cx = points[0].x - offsetX;
    const cy = points[0].y - offsetY;
    return `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0 Z`;
  }

  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];

  for (let i = 0; i < n; i++) {
    const p = points[i];

    // --- Tangent ---
    let tx: number, ty: number;
    if (i === 0) {
      tx = points[1].x - p.x;
      ty = points[1].y - p.y;
    } else if (i === n - 1) {
      tx = p.x - points[i - 1].x;
      ty = p.y - points[i - 1].y;
    } else {
      tx = points[i + 1].x - points[i - 1].x;
      ty = points[i + 1].y - points[i - 1].y;
    }
    const len = Math.hypot(tx, ty) || 1;
    const px = -ty / len; // perpendicular (rotasi 90°)
    const py = tx / len;

    // --- Taper di awal & akhir ---
    let taper = 1;
    if (n >= 6) {
      const t = i / (n - 1);
      if (t < 0.12) taper = 0.3 + (t / 0.12) * 0.7;
      else if (t > 0.88) taper = 0.3 + ((1 - t) / 0.12) * 0.7;
    } else if (n >= 3) {
      // Stroke pendek: taper berdasar jarak dari tengah
      const mid = (n - 1) / 2;
      const fromMid = Math.abs(i - mid);
      taper = Math.max(0.4, 1 - fromMid * 0.25);
    }

    // --- Noise organik (deterministik, tidak flicker saat re-render) ---
    const noise = hash01(i) - 0.5; // -0.5 .. 0.5
    const organicMul = 1 + noise * 0.3; // ±15%

    const pointW = p.w ?? 1;
    const half = (baseWidth * pointW * taper * organicMul) / 2;

    left.push({
      x: p.x - offsetX + px * half,
      y: p.y - offsetY + py * half,
    });
    right.push({
      x: p.x - offsetX - px * half,
      y: p.y - offsetY - py * half,
    });
  }

  // Trace: kiri maju
  let d = `M${left[0].x.toFixed(2)},${left[0].y.toFixed(2)}`;
  for (let i = 1; i < n; i++) {
    d += ` L${left[i].x.toFixed(2)},${left[i].y.toFixed(2)}`;
  }
  // Kanan mundur
  for (let i = n - 1; i >= 0; i--) {
    d += ` L${right[i].x.toFixed(2)},${right[i].y.toFixed(2)}`;
  }
  d += " Z";
  return d;
}

/** Deterministic pseudo-random 0..1 — tidak berubah antar render. */
function hash01(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
