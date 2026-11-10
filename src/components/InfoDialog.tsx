// =========================================================================
// src/components/InfoDialog.tsx
// Modal overlay generik. Body berupa HTML string (dikontrol BoardApp),
// dirender via dangerouslySetInnerHTML agar bisa memuat <kbd>, <code>, dll.
// =========================================================================

"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// -------------------------------------------------------------------------
// PROPS
// -------------------------------------------------------------------------
export interface InfoDialogProps {
  /** Judul dialog. Null = dialog tertutup. */
  title: string | null;
  /** HTML string. Aman karena hanya berasal dari kode kita sendiri. */
  html: string;
  onClose: () => void;
}

// -------------------------------------------------------------------------
// KOMPONEN
// -------------------------------------------------------------------------
export function InfoDialog({ title, html, onClose }: InfoDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const isOpen = title !== null;

  // Escape untuk menutup
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Focus tombol close saat dibuka (focus trap minimal)
  useEffect(() => {
    if (!isOpen) return;
    // Delay mikro agar elemen ter-render dulu
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(15,23,42,0.4)]"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-[440px] max-w-[90vw] rounded-xl bg-panel shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 id="dialog-title" className="m-0 text-sm font-semibold text-ink">
            {title}
          </h3>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors duration-100 hover:bg-gray-100 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div
          className="dialog-body px-5 py-4 text-[12.5px] leading-[1.7] text-gray-700"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Footer */}
        <div className="flex justify-end gap-2 rounded-b-xl border-t border-border bg-[#fafafa] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-[30px] items-center rounded-md border border-accent bg-accent px-3.5 text-xs font-medium text-white transition-colors duration-100 hover:border-accent-hover hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
