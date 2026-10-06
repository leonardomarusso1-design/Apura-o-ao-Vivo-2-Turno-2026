import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Ambientes: preview da Vercel libera a barra de comentários; Analytics/Tag Manager só entram na CSP se houver ID configurado.
const isPreview = process.env.VERCEL_ENV === "preview";
const vercelLive = isPreview ? " https://vercel.live" : "";
const usaGoogle = Boolean(process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_GTM_ID);
const gScript = usaGoogle ? " https://www.googletagmanager.com" : "";
const gConnect = usaGoogle
  ? " https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://stats.g.doubleclick.net"
  : "";
const gImg = usaGoogle ? " https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com" : "";

// 'unsafe-inline' em script continua porque o Next injeta scripts inline e o nonce obrigaria a renderizar toda página
// de forma dinâmica (sem cache de CDN). O risco fica baixo porque o site não renderiza HTML de usuário.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://challenges.cloudflare.com${gScript}${vercelLive}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${gImg}${vercelLive}`,
  "font-src 'self' data:",
  `connect-src 'self'${gConnect}${vercelLive}${isPreview ? " wss://ws-us3.pusher.com" : ""}`,
  `frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com${vercelLive}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// Domínio principal (de NEXT_PUBLIC_SITE_URL). Só redireciona o endereço antigo quando o principal NÃO é vercel.app nem localhost.
function hostPrincipal(): string | null {
  try {
    const h = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").hostname;
    return h && h !== "localhost" && !h.endsWith(".vercel.app") ? h : null;
  } catch {
    return null;
  }
}
const ANTIGOS = (process.env.LEGACY_HOSTS ?? "apuracaoaovivo2026.vercel.app")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async redirects() {
    const principal = hostPrincipal();
    if (!principal || process.env.VERCEL_ENV !== "production") return [];
    return ANTIGOS.filter((h) => h !== principal).map((h) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: h }],
      destination: `https://${principal}/:path*`,
      permanent: true,
    }));
  },
  async rewrites() {
    return [{ source: "/.well-known/security.txt", destination: "/security.txt" }];
  },
  async headers() {
    return [
      { source: "/flags/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // Páginas da apuração renderizam no servidor com dado ao vivo: o CDN guarda 10 s (stale-while-revalidate 30 s) e absorve o pico.
      { source: "/apuracao/:turno(1|2)", headers: [{ key: "Cache-Control", value: "public, max-age=0, s-maxage=10, stale-while-revalidate=30" }] },
      { source: "/candidatos/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default config;
