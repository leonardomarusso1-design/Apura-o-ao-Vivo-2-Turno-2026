import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { clientIp, hashIp } from "@/lib/ip";
import { limited } from "@/lib/ratelimit";
import { adminOk } from "@/lib/admin";
import { forbidden, readJson, sameOrigin } from "@/lib/security";
import { camToString, lerCamera } from "@/lib/camera";
import {
  IMG_DATA_RE,
  K_PATRO,
  MAX_IMGS,
  MAX_IMG_CHARS,
  kImg,
  limparLink,
  limparSeg,
  limparTextos,
  normalizarSalvo,
  type PatroSalvo,
} from "@/lib/patro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ler(): Promise<PatroSalvo | null> {
  const raw = await redis<string>(["GET", K_PATRO]);
  if (!raw) return null;
  try {
    return normalizarSalvo(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Público: o site e o Modo TV (inclusive o do OBS) leem aqui. As imagens vão por outra rota, que o CDN guarda por versão. */
export async function GET() {
  const p = await ler();
  const corpo = p
    ? {
        texto: p.texto,
        faixas: p.faixas,
        imgs: p.imgs.flatMap((tem, i) => (tem ? [`/api/patro/img?i=${i}&v=${p.v}`] : [])),
        links: p.imgs.flatMap((tem, i) => (tem ? [p.links[i] ?? ""] : [])),
        camera: p.camera,
        seg: p.seg,
      }
    : { texto: "", faixas: [] as string[], imgs: [] as string[], links: [] as string[], camera: "", seg: 8 };
  return NextResponse.json(corpo, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } });
}

type Corpo = { texto?: unknown; faixas?: unknown; imgs?: unknown; links?: unknown; camera?: unknown; seg?: unknown };

/**
 * Painel /admin/patro. Senha = ADMIN_SECRET (Bearer).
 * imgs: lista de até 4 itens; cada um "data:image..." troca, "" remove, null mantém.
 */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  if (await limited(`patro:${hashIp(clientIp(req))}`, 10, 60)) return NextResponse.json({ ok: false, erro: "devagar" }, { status: 429 });
  if (!adminOk(req)) return NextResponse.json({ ok: false, erro: "senha" }, { status: 401 });

  const b = await readJson<Corpo>(req, MAX_IMG_CHARS * MAX_IMGS + 8000);
  if (!b || typeof b !== "object") return NextResponse.json({ ok: false, erro: "corpo" }, { status: 400 });
  const { texto, faixas } = limparTextos(b.texto, b.faixas);

  let camera = "";
  if (typeof b.camera === "string" && b.camera.trim() !== "") {
    const c = lerCamera(b.camera);
    if (!c) return NextResponse.json({ ok: false, erro: "camera" }, { status: 400 });
    camera = camToString(c);
  }

  const atual = await ler();
  const imgs = atual?.imgs ?? Array.from({ length: MAX_IMGS }, () => false);
  if (Array.isArray(b.imgs)) {
    for (let i = 0; i < MAX_IMGS; i++) {
      const x = b.imgs[i];
      if (x === "") {
        await redis(["DEL", kImg(i)]);
        imgs[i] = false;
      } else if (typeof x === "string") {
        if (x.length > MAX_IMG_CHARS || !IMG_DATA_RE.test(x)) return NextResponse.json({ ok: false, erro: "imagem" }, { status: 400 });
        const ok = await redis(["SET", kImg(i), x]);
        if (ok === null) return NextResponse.json({ ok: false, erro: "redis" }, { status: 503 });
        imgs[i] = true;
      }
    }
  }
  const novo: PatroSalvo = { texto, faixas, v: Date.now(), imgs, links: Array.from({ length: MAX_IMGS }, (_, i) => limparLink(Array.isArray(b.links) ? b.links[i] : "")), camera, seg: limparSeg(b.seg) };
  const ok = await redis(["SET", K_PATRO, JSON.stringify(novo)]);
  if (ok === null) return NextResponse.json({ ok: false, erro: "redis" }, { status: 503 });
  return NextResponse.json({ ok: true, v: novo.v }, { headers: { "Cache-Control": "no-store" } });
}
