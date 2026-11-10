// =========================================================================
// src/app/page.tsx
// Entry point halaman. Server Component yang hanya merender <BoardApp />.
//
// Kenapa tidak "use client" di sini?
// - page.tsx tetap Server Component agar halaman bisa di-render statis.
// - Semua state interaktif dipindahkan ke <BoardApp /> (Client Component).
// - Boundary client/server jadi jelas & bundel client tetap kecil.
// =========================================================================

import { BoardApp } from "@/components/BoardApp";

export default function HomePage() {
  return <BoardApp />;
}
