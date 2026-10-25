import { NextResponse } from "next/server";
import { redis, redisPipeline } from "@/lib/redis";
import { clientIp, hashIp } from "@/lib/ip";
import { limited } from "@/lib/ratelimit";
import { adminOk } from "@/lib/admin";
import { readJson } from "@/lib/security";
import { K_SLOT_ATUAL, K_SLOT_PEND, K_SLOT_PRECO, PRECO_INICIAL, type SlotAd, type SlotPend } from "@/lib/slot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function porta(req: Request) {
  if (await limited(`admslot:${hashIp(clientIp(req))}`, 60, 60)) return NextResponse.json({ ok: false, erro: "devagar" }, { status: 429 });
  if (!adminOk(req)) return NextResponse.json({ ok: false, erro: "senha" }, { status: 401 });
  return null;
}

export async function GET(req: Request) {
  const n = await porta(req);
  if (n) return n;
  const r = await redisPipeline([["GET", K_SLOT_ATUAL], ["GET", K_SLOT_PRECO], ["HGETALL", K_SLOT_PEND]]);
  let atual: SlotAd | null = null;
  try {
    atual = typeof r?.[0] === "string" ? (JSON.parse(r[0]) as SlotAd) : null;
  } catch {
    atual = null;
  }
  const p = Number(r?.[1]);
  const preco = Number.isFinite(p) && p > 0 ? Math.floor(p) : PRECO_INICIAL;
  const flat = Array.isArray(r?.[2]) ? (r[2] as string[]) : [];
  const pend: SlotPend[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    try {
      pend.push(JSON.parse(flat[i + 1]) as SlotPend);
    } catch {
      /* ignora */
    }
  }
  pend.sort((a, b) => Number(b.pagou) - Number(a.pagou) || b.t - a.t);
  return NextResponse.json({ ok: true, atual, preco, pend });
}

/** Ações: aprovar {id} (entra no ar e o preço dobra), recusar {id}, limpar (tira o anúncio do ar), preco {valor}. */
export async function POST(req: Request) {
  const n = await porta(req);
  if (n) return n;
  const b = await readJson<{ acao?: string; id?: string; valor?: number }>(req, 512);
  if (!b) return NextResponse.json({ ok: false }, { status: 400 });
  if (b.acao === "recusar" && b.id) {
    await redis(["HDEL", K_SLOT_PEND, b.id]);
  } else if (b.acao === "aprovar" && b.id) {
    const raw = await redis<string>(["HGET", K_SLOT_PEND, b.id]);
    if (!raw) return NextResponse.json({ ok: false, erro: "sumiu" }, { status: 404 });
    const p = JSON.parse(raw) as SlotPend;
    const ad: SlotAd = { marca: p.marca, frase: p.frase, site: p.site, pago: p.preco, t: Date.now() };
    await redis(["SET", K_SLOT_ATUAL, JSON.stringify(ad)]);
    await redis(["SET", K_SLOT_PRECO, String(p.preco * 2)]);
    await redis(["HDEL", K_SLOT_PEND, b.id]);
  } else if (b.acao === "limpar") {
    await redis(["DEL", K_SLOT_ATUAL]);
  } else if (b.acao === "preco" && typeof b.valor === "number" && b.valor >= 1 && b.valor <= 1_000_000) {
    await redis(["SET", K_SLOT_PRECO, String(Math.floor(b.valor))]);
  } else {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
