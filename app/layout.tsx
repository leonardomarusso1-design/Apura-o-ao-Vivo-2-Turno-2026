import type { Metadata, Viewport } from "next";
import "./globals.css";
import FundoRede from "@/components/FundoRede";
import JsonLdScript from "@/components/JsonLdScript";
import Analytics from "@/components/Analytics";
import StatsBar from "@/components/StatsBar";
import { SITE_NAME, SITE_URL } from "@/lib/env";
import { DESCRICAO_SITE, grafoSite } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} | Eleições 2026`, template: `%s | ${SITE_NAME}` },
  description: DESCRICAO_SITE,
  applicationName: SITE_NAME,
  authors: [{ name: "Marusso Produções", url: "https://www.instagram.com/leomvideomaker" }],
  creator: "Marusso Produções",
  category: "news",
  alternates: { canonical: "/", languages: { "pt-BR": "/" } },
  openGraph: {
    title: `${SITE_NAME} | Eleições 2026`,
    description: "Resultado das eleições 2026 em tempo real, com mapa por estado e município. Dados oficiais do TSE.",
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    url: "/",
    images: [{ url: "/icons/og-apuracao.png", width: 1200, height: 630, alt: "Apuração ao vivo: mapa, placar e projeção" }],
  },
  twitter: { card: "summary_large_image", images: ["/icons/og-apuracao.png"] },
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  formatDetection: { telephone: false, email: false, address: false },
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
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-lime focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink"
        >
          Pular para o conteúdo
        </a>
        <JsonLdScript dados={grafoSite()} />
        <FundoRede />
        <StatsBar />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
