export const dynamic = "force-static";

/** ads.txt exigido pelo AdSense: https://seudominio/ads.txt */
export function GET() {
  const c = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "").replace(/^ca-/, ""); // pub-XXXX
  const body = /^pub-\d{10,20}$/.test(c) ? `google.com, ${c}, DIRECT, f08c47fec0942fa0\n` : "";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
