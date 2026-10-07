import { redis } from "@/lib/redis";
import { IMG_DATA_RE, MAX_IMGS, kImg } from "@/lib/patro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Imagem i do carrossel. A URL leva ?v=<versão>, então o CDN pode guardar para sempre: trocar a imagem muda a URL. */
export async function GET(req: Request) {
  const i = Number(new URL(req.url).searchParams.get("i") ?? "0");
  if (!Number.isInteger(i) || i < 0 || i >= MAX_IMGS) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  const raw = await redis<string>(["GET", kImg(i)]);
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
