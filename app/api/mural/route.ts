import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { clientIp, hashIp } from "@/lib/ip";
import { limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mural sem texto livre: reações em emoji e um palpite sobre o ANDAMENTO da apuração (não sobre candidato). */
const REACOES = ["aplauso", "uau", "triste", "fogo"] as const;
const FAIXAS = ["f1", "f2", "f3", "f4", "f5", "f6"] as const;
const K_R = "mural:reacoes:v1";
const K_P = "mural:palpite:v1";

const mem = { r: {} as Record<string, number>, p: {} as Record<string, number>, quem: new Set<string>() };

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
  let b: { tipo?: string; k?: string } = {};
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const quem = hashIp(clientIp(req));
  if (await limited(`mural:${quem}`, 60, 60)) return NextResponse.json({ ok: false, erro: "devagar" }, { status: 429 });

  if (b.tipo === "reacao" && REACOES.includes(b.k as (typeof REACOES)[number])) {
    const n = await redis<number>(["HINCRBY", K_R, b.k!, 1]);
    if (n === null) mem.r[b.k!] = (mem.r[b.k!] ?? 0) + 1;
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
