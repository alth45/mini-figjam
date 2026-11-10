// =========================================================================
// src/components/TopBar.tsx
// Topbar: logo, menu dropdown, input judul, avatars, tombol Share.
// Semua aksi (save/undo/insert/etc) diteruskan ke BoardApp via onAction.
// =========================================================================

"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import type { BoardAction } from "@/lib/actions";

// -------------------------------------------------------------------------
// KONFIGURASI MENU
// -------------------------------------------------------------------------
// Setiap item punya: label, action, shortcut (opsional), disabled (opsional).
// `sep` menandai separator antar grup.
// -------------------------------------------------------------------------
interface MenuItem {
  label: string;
  action: BoardAction;
  shortcut?: string;
  /** Tampilkan disabled jika fungsi ini mengembalikan false. */
  isDisabled?: (ctx: MenuContext) => boolean;
}

interface MenuSeparator {
  type: "separator";
}

type MenuEntry = MenuItem | MenuSeparator;

interface MenuConfig {
  id: string;
  label: string;
  items: MenuEntry[];
}

interface MenuContext {
  canUndo: boolean;
  canRedo: boolean;
}

const MENUS: MenuConfig[] = [
  {
    id: "file",
    label: "File",
    items: [
      { label: "Papan Baru", action: "new", shortcut: "Ctrl+Alt+N" },
      { label: "Simpan", action: "save", shortcut: "Ctrl+S" },
      { label: "Ekspor JSON", action: "export" },
      { type: "separator" },
      { label: "Kosongkan Papan", action: "clear" },
    ],
  },
  {
    id: "edit",
    label: "Edit",
    items: [
      {
        label: "Urungkan",
        action: "undo",
        shortcut: "Ctrl+Z",
        isDisabled: (c) => !c.canUndo,
      },
      {
        label: "Ulangi",
        action: "redo",
        shortcut: "Ctrl+Y",
        isDisabled: (c) => !c.canRedo,
      },
      { type: "separator" },
      { label: "Duplikat", action: "duplicate", shortcut: "Ctrl+D" },
      { label: "Hapus", action: "delete", shortcut: "Del" },
      { type: "separator" },
      { label: "Bawa ke Depan", action: "front", shortcut: "Ctrl+]" },
      { label: "Kirim ke Belakang", action: "back", shortcut: "Ctrl+[" },
    ],
  },
  {
    id: "view",
    label: "View",
    items: [
      { label: "Perbesar", action: "zoom-in", shortcut: "Ctrl++" },
      { label: "Perkecil", action: "zoom-out", shortcut: "Ctrl+-" },
      { label: "Zoom 100%", action: "zoom-100", shortcut: "Ctrl+0" },
      { label: "Zoom ke Isi", action: "zoom-fit", shortcut: "Shift+1" },
      { type: "separator" },
      { label: "Tampilkan Grid", action: "toggle-grid" },
    ],
  },
  {
    id: "insert",
    label: "Sisipkan",
    items: [
      { label: "Sticky Note", action: "insert-sticky", shortcut: "S" },
      { label: "Teks", action: "insert-text", shortcut: "T" },
      { label: "Persegi", action: "insert-rect", shortcut: "R" },
      { label: "Elips", action: "insert-ellipse", shortcut: "O" },
      { label: "Panah", action: "insert-arrow", shortcut: "A" },
      { label: "Gambar Bebas", action: "insert-pen", shortcut: "P" },
    ],
  },
  {
    id: "help",
    label: "Bantuan",
    items: [
      { label: "Daftar Pintasan", action: "shortcut" },
      { label: "Tentang Mini FigJam", action: "about" },
    ],
  },
];

// -------------------------------------------------------------------------
// PROPS
// -------------------------------------------------------------------------
interface TopBarProps {
  title: string;
  onTitleChange: (title: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onAction: (action: BoardAction) => void;
}

// -------------------------------------------------------------------------
// COMPONENT
// -------------------------------------------------------------------------
export function TopBar({
  title,
  onTitleChange,
  canUndo,
  canRedo,
  onAction,
}: TopBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const topbarRef = useRef<HTMLDivElement>(null);
  const ctx: MenuContext = { canUndo, canRedo };

  // Tutup menu saat klik di luar topbar
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      if (!topbarRef.current?.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenu]);

  // Tutup menu saat Escape
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openMenu]);

  const handleMenuClick = (id: string) => {
    setOpenMenu((prev) => (prev === id ? null : id));
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.isDisabled?.(ctx)) return;
    setOpenMenu(null);
    onAction(item.action);
  };

  return (
    <div
      ref={topbarRef}
      className="relative z-50 flex h-11 flex-none select-none items-center border-b border-border bg-panel px-3 shadow-panel"
    >
      {/* Logo */}
      <div className="mr-4 flex items-center gap-1.5 text-[13px] font-bold tracking-tight text-ink">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-gradient-to-br from-accent to-pink-500 text-sm font-extrabold text-white">
          F
        </span>
        Mini FigJam
      </div>

      {/* Menu */}
      <div className="flex items-center gap-0.5">
        {MENUS.map((menu) => {
          const isOpen = openMenu === menu.id;
          return (
            <div key={menu.id} className="relative">
              <button
                type="button"
                onClick={() => handleMenuClick(menu.id)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                className={[
                  "rounded-[5px] px-2.5 py-1.5 text-xs text-ink transition-colors duration-100",
                  isOpen ? "bg-gray-100" : "hover:bg-gray-100",
                ].join(" ")}
              >
                {menu.label}
              </button>

              {isOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-[calc(100%+4px)] min-w-[230px] rounded-lg border border-border bg-panel p-1.5 shadow-lg"
                >
                  {menu.items.map((item, i) => {
                    if ("type" in item && item.type === "separator") {
                      return (
                        <div
                          key={`sep-${i}`}
                          className="my-1 h-px bg-border mx-1.5"
                          role="separator"
                        />
                      );
                    }
                    const mi = item as MenuItem;
                    const disabled = mi.isDisabled?.(ctx) ?? false;
                    return (
                      <button
                        key={mi.action}
                        type="button"
                        role="menuitem"
                        onClick={() => handleItemClick(mi)}
                        disabled={disabled}
                        className={[
                          "flex w-full items-center justify-between gap-6 rounded-[5px] px-2.5 py-[7px] text-left text-xs",
                          disabled
                            ? "cursor-not-allowed text-gray-400"
                            : "text-ink hover:bg-accent-soft hover:text-accent",
                        ].join(" ")}
                      >
                        <span>{mi.label}</span>
                        {mi.shortcut && (
                          <span
                            className={[
                              "text-[11px]",
                              disabled
                                ? "text-gray-400"
                                : "text-muted group-hover:text-accent",
                            ].join(" ")}
                          >
                            {mi.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Title input */}
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        spellCheck={false}
        aria-label="Judul papan"
        className="w-[220px] rounded-md border border-transparent bg-transparent px-3 py-1.5 text-center text-[13px] font-medium text-ink outline-none transition-colors duration-100 hover:bg-gray-100 focus:border-accent focus:bg-white focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
      />

      {/* Avatars */}
      <div className="mx-3 flex">
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-accent to-pink-500 text-[11px] font-bold text-white shadow-panel">
          A
        </div>
        <div className="-ml-1.5 flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-figjam-blue to-cyan-500 text-[11px] font-bold text-white shadow-panel">
          B
        </div>
      </div>

      {/* Share button */}
      <button
        type="button"
        onClick={() => onAction("share")}
        className="flex h-[30px] items-center gap-1.5 rounded-md border border-accent bg-accent px-3.5 text-xs font-medium text-white transition-colors duration-100 hover:border-accent-hover hover:bg-accent-hover"
      >
        <Share2 size={14} strokeWidth={2} aria-hidden="true" />
        Bagikan
      </button>
    </div>
  );
}
