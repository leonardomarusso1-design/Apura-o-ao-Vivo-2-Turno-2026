import { redis } from "@/lib/redis";
import { IMG_DATA_RE, K_PATRO_IMG } from "@/lib/patro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Imagem do banner. A URL leva ?v=<versão>, então o CDN pode guardar para sempre: trocar a imagem muda a URL. */
export async function GET() {
  const raw = await redis<string>(["GET", K_PATRO_IMG]);
  if (!raw || !IMG_DATA_RE.test(raw)) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  const [cab, b64] = raw.split(",", 2);
  const tipo = /^data:(image\/[a-z]+);/.exec(cab)?.[1] ?? "image/jpeg";
  const bytes = new Uint8Array(Buffer.from(b64, "base64"));
  return new Response(bytes, {
    headers: {
      "Content-Type": tipo,
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
