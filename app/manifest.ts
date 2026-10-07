import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/env";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Apuração ao vivo`,
    short_name: "Apuração 2026",
    description: "Apuração ao vivo do 2º turno com mapa por município, placar e projeção.",
    start_url: "/apuracao",
    display: "standalone",
    background_color: "#022058",
    theme_color: "#022058",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
