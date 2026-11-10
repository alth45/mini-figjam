// =========================================================================
// src/app/apple-icon.tsx
// Apple touch icon 180x180 (PNG). Di-generate otomatis oleh Next.js
// saat build via ImageResponse (Satori).
// =========================================================================

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)",
        color: "#ffffff",
        fontSize: 130,
        fontWeight: 900,
        fontFamily: "system-ui, -apple-system, sans-serif",
        letterSpacing: -6,
        paddingBottom: 8,
      }}
    >
      F
    </div>,
    { ...size },
  );
}
