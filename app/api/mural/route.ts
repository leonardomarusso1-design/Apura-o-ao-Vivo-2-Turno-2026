import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { clientIp, hashIp } from "@/lib/ip";
import { limited } from "@/lib/ratelimit";
import { forbidden, readJson, sameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mural sem texto livre: reações em emoji e um palpite sobre o ANDAMENTO da apuração (não sobre candidato). */
const REACOES = ["aplauso", "uau", "triste", "fogo"] as const;
const FAIXAS = ["f1", "f2", "f3", "f4", "f5", "f6"] as const;
const K_R = "mural:reacoes:v1";
const K_P = "mural:palpite:v1";

const mem = { r: {} as Record<string, number>, p: {} as Record<string, number>, quem: new Set<string>(), minha: new Map<string, string>() };

function parse(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (Array.isArray(raw)) for (let i = 0; i + 1 < raw.length; i += 2) out[String(raw[i])] = Number(raw[i + 1]) || 0;
  return out;
}

async function ler() {
  const [r, p] = await Promise.all([redis<unknown>(["HGETALL", K_R]), redis<unknown>(["HGETALL", K_P])]);
  const R = r === null ? mem.r : parse(r);
  const P = p === null ? mem.p : parse(p);
  return {
    reacoes: Object.fromEntries(REACOES.map((k) => [k, R[k] ?? 0])),
    palpites: Object.fromEntries(FAIXAS.map((k) => [k, P[k] ?? 0])),
  };
}

export async function GET() {
  return NextResponse.json(await ler(), { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" } });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const b = await readJson<{ tipo?: string; k?: string; cid?: string }>(req, 512);
  if (!b || typeof b !== "object") return NextResponse.json({ ok: false }, { status: 400 });
  const quem = hashIp(clientIp(req));
  if (await limited(`mural:${quem}`, 60, 60)) return NextResponse.json({ ok: false, erro: "devagar" }, { status: 429 });

  const cid = typeof b.cid === "string" && /^[a-z0-9-]{12,40}$/.test(b.cid) ? b.cid : null;
  if (b.tipo === "reacao" && REACOES.includes(b.k as (typeof REACOES)[number])) {
    // uma reação por pessoa (id do navegador, ou a rede como alternativa): trocar move o voto, repetir a mesma tira
    const id = `mural:r:${cid ?? quem}`;
    const k = b.k!;
    let prev = await redis<string>(["GET", id]);
    if (prev === null && !process.env.UPSTASH_REDIS_REST_URL) prev = mem.minha.get(id) ?? null;
    if (prev === k) {
      await redis(["HINCRBY", K_R, k, -1]);
      await redis(["DEL", id]);
      mem.minha.delete(id);
      mem.r[k] = Math.max(0, (mem.r[k] ?? 0) - 1);
    } else {
      if (prev && REACOES.includes(prev as (typeof REACOES)[number])) {
        await redis(["HINCRBY", K_R, prev, -1]);
        mem.r[prev] = Math.max(0, (mem.r[prev] ?? 0) - 1);
      }
      await redis(["SET", id, k, "EX", 60 * 60 * 24 * 7]);
      mem.minha.set(id, k);
      const n = await redis<number>(["HINCRBY", K_R, k, 1]);
      if (n === null) mem.r[k] = (mem.r[k] ?? 0) + 1;
    }
  } else if (b.tipo === "palpite" && FAIXAS.includes(b.k as (typeof FAIXAS)[number])) {
    // um palpite por pessoa (aproximado por rede/IP: o navegador também guarda a marca)
    const got = await redis<string>(["SET", `mural:quem:${quem}`, "1", "NX", "EX", 60 * 60 * 24 * 7]);
    const ja = got === null ? mem.quem.has(quem) : got !== "OK";
    if (ja) return NextResponse.json({ ok: false, erro: "ja-votou", ...(await ler()) });
    if (got === null) mem.quem.add(quem);
    const n = await redis<number>(["HINCRBY", K_P, b.k!, 1]);
    if (n === null) mem.p[b.k!] = (mem.p[b.k!] ?? 0) + 1;
  } else {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...(await ler()) });
}
