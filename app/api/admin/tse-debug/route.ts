import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://resultados.tse.jus.br/oficial/";
const ELE = "006257";

/** Alvos FIXOS (allowlist). Nunca aceita URL do cliente => sem SSRF. Chame poucas vezes: 404s podem bloquear o IP. */
const TARGETS: Record<string, string> = {
  zz: `ele2026/6257/dados/zz/zz-c0001-e${ELE}-u.json`,
  br: `ele2026/6257/dados/br/br-c0001-e${ELE}-u.json`,
  sp: `ele2026/6257/dados/sp/sp-c0001-e${ELE}-u.json`,
  cfg: `ele2026/6257/config/mun-e${ELE}-cm.json`,
  // 2022 (2º turno presidente = 545): dois formatos possíveis, testar 1x cada
  // Governadores: catálogo de eleições (códigos) e um estado de exemplo (1º turno, cargo 3)
  elec: "comum/config/ele-c.json",
  gov1: `ele2026/6259/dados/sp/sp-c0003-e006259-u.json`,
  p22a: "ele2022/545/dados-simplificados/sp/sp-c0001-e000545-r.json",
  p22b: "ele2022/545/dados/sp/sp-c0001-e000545-u.json",
};

function authorized(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (process.env.TSE_DEBUG !== "1" || !secret || secret.length < 24) return false;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Resume só a ESTRUTURA do JSON (chaves, tipos, tamanhos de arrays e 1 amostra curta). */
function shape(v: unknown, depth = 0): unknown {
  if (Array.isArray(v)) return { _array: v.length, _item: v.length && depth < 4 ? shape(v[0], depth + 1) : null };
  if (v && typeof v === "object") {
    if (depth >= 4) return "{…}";
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).slice(0, 40).map(([k, x]) => [k, shape(x, depth + 1)]));
  }
  return typeof v === "string" ? v.slice(0, 40) : v;
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse(null, { status: 404 });
  const sp = new URL(req.url).searchParams;
  const key = sp.get("t") ?? "";
  const u = sp.get("u") ?? "";
  const m = sp.get("m") ?? "";
  let path = TARGETS[key];
  // ?t=cfg&u=zz  => 3 primeiras cidades do exterior (estrutura real); ?t=mun&u=zz&m=12345 => resultado de 1 município
  if (key === "mun" && /^[a-z]{2}$/.test(u) && /^\d{1,6}$/.test(m)) {
    path = `ele2026/6257/dados/${u}/${u}${m}-c0001-e${ELE}-u.json`;
  }
  if (!path) return NextResponse.json({ ok: false, targets: Object.keys(TARGETS) }, { status: 400 });
  try {
    const r = await fetch(BASE + path, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const text = await r.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* não-JSON */
    }
    if (key === "cfg" && /^[a-z]{2}$/.test(u) && parsed) {
      const abr = (parsed as { abr?: { cd: string; mu?: unknown[] }[] }).abr?.find((a) => a.cd === u);
      if (sp.get("l") === "1") {
        const lista = (abr?.mu ?? []) as { cd: string; nm: string }[];
        return NextResponse.json({ total: lista.length, lista: lista.map((x) => `${x.cd}|${x.nm}`).join(";") });
      }
      return NextResponse.json({ status: r.status, cd: abr?.cd, total: abr?.mu?.length ?? 0, amostra: abr?.mu?.slice(0, 3) ?? null });
    }
    return NextResponse.json({ status: r.status, bytes: text.length, shape: parsed ? shape(parsed) : text.slice(0, 200) });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 502 });
  }
}
