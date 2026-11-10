// =========================================================================
// src/app/layout.tsx
// Root layout Next.js 16 App Router.
// - Memuat Inter via next/font/google (self-hosted, tanpa FOUT).
// - Menyiapkan html/body full-height untuk canvas fullscreen.
// - Metadata SEO dasar.
// =========================================================================

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// -------------------------------------------------------------------------
// FONT
// -------------------------------------------------------------------------
// next/font/google akan mengunduh & menyimpan font saat build,
// jadi tidak ada request ke Google Fonts saat user membuka halaman.
// Variabel --font-inter dipakai oleh globals.css (@theme --font-sans).
// -------------------------------------------------------------------------
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// -------------------------------------------------------------------------
// METADATA
// -------------------------------------------------------------------------
export const metadata: Metadata = {
  title: "Mini FigJam — Papan Kolaborasi",
  description:
    "Papan kolaborasi sederhana: sticky notes, teks, bentuk, panah, dan gambar bebas.",
  applicationName: "Mini FigJam",
  authors: [{ name: "Mini FigJam" }],
  // Nonaktifkan indexing jika ini hanya demo internal
  robots: { index: false, follow: false },
};

// -------------------------------------------------------------------------
// VIEWPORT
// -------------------------------------------------------------------------
// Next.js 15+ memisahkan `viewport` dari `metadata` (deprecated themeColor
// di metadata). Ini menghindari warning saat build.
// -------------------------------------------------------------------------
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Warna address bar mobile — samakan dengan bg canvas
  themeColor: "#f3f4f6",
};

// -------------------------------------------------------------------------
// LAYOUT
// -------------------------------------------------------------------------
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
