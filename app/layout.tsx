import type { Metadata, Viewport } from "next";
import "./globals.css";
import FundoRede from "@/components/FundoRede";
import { SITE_NAME, SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} — 2º turno 2026`,
  description:
    "Acompanhe a apuração do 2º turno das eleições 2026 em tempo real, com mapa, projeção e comparação com 2022. Cadastre-se para ser avisado.",
  openGraph: {
    title: `${SITE_NAME} — 2º turno 2026`,
    description: "Apuração em tempo real do 2º turno. Entre na lista e seja avisado quando começar.",
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    images: [{ url: "/icons/og-apuracao.png", width: 1200, height: 630, alt: "Apuração ao vivo do 2º turno — mapa, placar e projeção" }],
  },
  twitter: { card: "summary_large_image", images: ["/icons/og-apuracao.png"] },
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#07090e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <FundoRede />
        {children}
      </body>
    </html>
  );
}
