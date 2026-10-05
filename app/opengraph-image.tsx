import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/env";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Apuração do 2º turno em tempo real";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0d0c",
          color: "#f3f1ea",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#c6f24e", letterSpacing: 4, textTransform: "uppercase" }}>
          {SITE_NAME} · 2º turno · 25/10
        </div>
        <div style={{ display: "flex", fontSize: 88, lineHeight: 1.05, fontFamily: "serif" }}>
          A apuração ao vivo. Seja avisado quando começar.
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#8a9792" }}>Mapa · Projeção · Comparação com 2022</div>
      </div>
    ),
    size,
  );
}
