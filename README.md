
# Mini FigJam

Papan kolaborasi mini berbasis web — sticky notes, teks, bentuk, panah, coretan tinta, mind map, dan multi-select. Dibangun dengan **Next.js 16** + **React 19** + **Tailwind CSS v4**.

> Demo: jalankan `npm run dev` lalu buka [http://localhost:3000](http://localhost:3000)

---

## ✨ Fitur

### Elemen
- **Sticky notes** — 9 palet warna, konten `contentEditable`, auto-hapus jika kosong
- **Teks bebas** — ukuran font, bold, align, warna kustom
- **Persegi & Elips** — fill warna, resize via handle sudut
- **Panah** — endpoint drag, kepala panah otomatis
- **Coretan tinta (ink)** — lebar variabel per kecepatan pointer, taper di ujung, noise organik (seperti pulpen sungguhan)
- **Mind map** — node berwarna per kedalaman, link kurva Bezier otomatis, `Tab` = child, `Enter` = sibling

### Interaksi
- **Multi-select** — `Shift+klik` toggle, drag di area kosong untuk marquee, `Ctrl+A` pilih semua
- **Group drag** — drag salah satu elemen terpilih → semua ikut bergerak
- **Group delete / duplicate / layer** — semua operasi bekerja pada seleksi
- **Pan & zoom** — Space+drag / middle-click / hand tool, `Ctrl+Scroll` zoom, `Shift+1` zoom-to-fit
- **Undo / redo** — history 100 langkah
- **Nudge** — panah keyboard untuk geser 1px, `Shift+Arrow` untuk 10px

### Persistensi & utilitas
- **Autosave** — debounced 1.5 detik ke `localStorage`, flush sebelum tab ditutup
- **Ekspor JSON** — unduh board sebagai file `.json`
- **Seed content** — contoh board interaktif saat pertama kali dibuka
- **Grid toggle** — tampil/sembunyikan grid
- **Favicon custom** — SVG + Apple touch icon

---

## 🛠 Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js **16.4** (App Router, Turbopack) |
| UI | React **19.2** |
| Styling | Tailwind CSS **v4** (`@theme` tokens) |
| Ikon | `lucide-react` |
| Bahasa | TypeScript **5.7** |
| Font | Inter via `next/font/google` (self-hosted) |
| Persistensi | `localStorage` |

---

## 🚀 Menjalankan

**Prasyarat**: Node.js **≥ 20.9** + npm

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

Build produksi:

```bash
npm run build
npm start
```

Type-check tanpa build:

```bash
npm run type-check
```

---

## 📂 Struktur Folder

```
src/
├── app/
│   ├── layout.tsx          # Root layout + Inter font + metadata
│   ├── page.tsx            # Server Component → render <BoardApp />
│   ├── globals.css         # Tailwind v4 @theme + token + grid + kbd
│   ├── icon.svg            # Favicon
│   └── apple-icon.tsx      # Apple touch icon (PNG via next/og)
│
├── lib/
│   ├── actions.ts          # BoardAction union
│   ├── bounds.ts           # getElementBounds (shared)
│   ├── constants.ts        # Palet warna, defaults, zoom, dll.
│   ├── mindmap.ts          # Layout & relasi mind node
│   ├── save-store.ts       # External store untuk save status
│   ├── storage.ts          # localStorage + export + seed
│   └── types.ts            # BoardElement union, dll.
│
├── hooks/
│   ├── useBoardState.ts    # Reducer state board + history
│   └── useCanvasView.ts    # Pan, zoom, koordinat
│
└── components/
    ├── BoardApp.tsx        # Thin orchestrator
    ├── board-app/          # Hooks board-app (bootstrap, autosave, actions, shortcuts)
    ├── Canvas.tsx          # Thin orchestrator
    ├── canvas/             # Hooks canvas (pointer, wheel, marquee, MindLinks)
    ├── ElementRenderer.tsx # Render 1 elemen (sticky/text/shape/arrow/draw/mindnode)
    ├── SelectionOverlay.tsx
    ├── ToolPalette.tsx
    ├── FloatToolbar.tsx
    ├── ZoomControls.tsx
    ├── TopBar.tsx
    ├── StatusBar.tsx
    └── InfoDialog.tsx
```

---

## ⌨️ Keyboard Shortcuts

### Alat

| Key | Tool |
|-----|------|
| `V` | Select |
| `H` | Hand (pan) |
| `S` | Sticky |
| `T` | Teks |
| `R` | Persegi |
| `O` | Elips |
| `A` | Panah |
| `P` | Pena (stroke seragam) |
| `I` | Tinta (variable width) |
| `M` | Mind map |
| `E` | Penghapus |

### Aksi

| Shortcut | Aksi |
|----------|------|
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+D` | Duplikat |
| `Ctrl+A` | Pilih semua |
| `Del` / `Backspace` | Hapus |
| `Ctrl+]` / `Ctrl+[` | Bawa ke depan / kirim ke belakang |
| `Ctrl+S` | Simpan |
| `Ctrl+0` | Zoom 100% |
| `Ctrl++` / `Ctrl+-` | Zoom in / out |
| `Shift+1` | Zoom to fit |
| `Space` (hold) | Pan mode |
| `Ctrl+Scroll` | Zoom |
| `Arrow keys` | Geser 1px (Shift = 10px) |
| `Tab` | Mind map: buat child |
| `Enter` | Mind map: buat sibling |
| `Escape` | Deselect / cancel edit |

---

## 🧠 Cara Kerja Fitur Kunci

### Coretan tinta
Bukan `<path stroke>` — dirender sebagai **polygon filled** dengan lebar bervariasi per titik, dihitung dari **kecepatan pointer** (cepat → tipis, lambat → tebal). Taper di awal/akhir + noise deterministik (tidak flicker antar render) membuatnya terlihat organik.

### Mind map
Node baru otomatis diposisikan di kanan parent, sibling di bawah saudara terakhir. Link kurva dirender otomatis dari relasi `parentId` — bukan elemen terpisah, jadi tidak perlu disimpan/undo-ed sendiri. Warna otomatis per `depth`.

### Multi-select
State `selectedIds: string[]`. Drag area kosong = marquee. `Shift+klik` = toggle. Semua operasi batch (`updateMany`, `deleteSelected`, `duplicateSelected`) bekerja pada array. Selection overlay menampilkan bounding box gabungan (handles hanya muncul saat 1 elemen terpilih).

### Hydration-safe timestamps
`saveStatus` + `savedAt` disimpan di **external store** via `useSyncExternalStore`. Server snapshot selalu `{ status: "saved", savedAt: null }` → tidak ada mismatch. Timestamp baru muncul setelah hydration + autosave.

---

## 🔧 Catatan Pengembangan

### Aturan React 19 yang perlu diperhatikan

- ❌ Jangan panggil `setState` langsung di body `useEffect` — pakai external store (`useSyncExternalStore`) untuk data eksternal.
- ❌ Jangan baca/tulis `ref.current` saat render — lakukan di `useEffect` atau event handler.
- ❌ Jangan panggil `new Date()` / `crypto.randomUUID()` / `Math.random()` di render path (Next.js 16 blocking prerender).
- ✅ Semua timestamp baru di dalam `useEffect` / event handler / `setTimeout`.

### Menambah tipe elemen baru

1. Tambah interface di `lib/types.ts` + masuk ke union `BoardElement`
2. Tambah case di `ElementRenderer.tsx`
3. Tambah case di `getElementBounds` (`lib/bounds.ts`) — jika punya bentuk geometri berbeda
4. Tambah case di `duplicateElement` (`hooks/useBoardState.ts`) + `switch` exhaustive `default`
5. Tambah case di `getPalette` (`FloatToolbar.tsx`) jika punya palet warna
6. Tambah label di `ELEMENT_LABELS` (`lib/constants.ts`)

TypeScript akan menandai error di semua switch yang tidak exhaustive — ikuti errornya sampai bersih.

---

## 📝 Lisensi

MIT — bebas dipakai, dimodifikasi, dan didistribusikan.

## 🙏 Credits

- Terinspirasi dari [FigJam](https://www.figma.com/figjam/) — semoga suatu hari bisa secanggih aslinya 😄
- Bootstrap: [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app)
