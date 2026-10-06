import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { redis } from "@/lib/redis";
import { clientIp, hashIp } from "@/lib/ip";
import { limited } from "@/lib/ratelimit";
import { forbidden, readJson, sameOrigin } from "@/lib/security";
import { IMG_DATA_RE, K_PATRO, K_PATRO_IMG, MAX_IMG_CHARS, limparTextos, type PatroSalvo } from "@/lib/patro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 24) return false;
  const dado = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(dado);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function ler(): Promise<PatroSalvo | null> {
  const raw = await redis<string>(["GET", K_PATRO]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PatroSalvo;
  } catch {
    return null;
  }
}

/** Público: o Modo TV (site e OBS) lê aqui a cada 30 s. A imagem vai por outra rota, que o CDN guarda por versão. */
export async function GET() {
  const p = await ler();
  const corpo = p
    ? { texto: p.texto, faixas: p.faixas, img: p.img ? `/api/patro/img?v=${p.v}` : "" }
    : { texto: "", faixas: [] as string[], img: "" };
  return NextResponse.json(corpo, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } });
}

/** Painel /admin/patro. Senha = ADMIN_SECRET (Bearer). img: texto "data:image..." troca, "" remove, ausente mantém. */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  if (await limited(`patro:${hashIp(clientIp(req))}`, 10, 60)) return NextResponse.json({ ok: false, erro: "devagar" }, { status: 429 });
  if (!autorizado(req)) return NextResponse.json({ ok: false, erro: "senha" }, { status: 401 });

  const b = await readJson<{ texto?: unknown; faixas?: unknown; img?: unknown }>(req, MAX_IMG_CHARS + 4000);
  if (!b || typeof b !== "object") return NextResponse.json({ ok: false, erro: "corpo" }, { status: 400 });
  const { texto, faixas } = limparTextos(b.texto, b.faixas);

  const atual = await ler();
  let temImg = atual?.img ?? false;
  if (typeof b.img === "string") {
    if (b.img === "") {
      await redis(["DEL", K_PATRO_IMG]);
      temImg = false;
    } else if (b.img.length <= MAX_IMG_CHARS && IMG_DATA_RE.test(b.img)) {
      const ok = await redis(["SET", K_PATRO_IMG, b.img]);
      if (ok === null) return NextResponse.json({ ok: false, erro: "redis" }, { status: 503 });
      temImg = true;
    } else {
      return NextResponse.json({ ok: false, erro: "imagem" }, { status: 400 });
    }
  }
  const novo: PatroSalvo = { texto, faixas, v: Date.now(), img: temImg };
  const ok = await redis(["SET", K_PATRO, JSON.stringify(novo)]);
  if (ok === null) return NextResponse.json({ ok: false, erro: "redis" }, { status: 503 });
  return NextResponse.json({ ok: true, v: novo.v }, { headers: { "Cache-Control": "no-store" } });
}
