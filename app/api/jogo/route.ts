import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { redis } from "@/lib/redis";
import { clientIp, hashIp } from "@/lib/ip";
import { limited } from "@/lib/ratelimit";
import { forbidden, readJson, sameOrigin } from "@/lib/security";
import { erroNome, MAX_PTS_POR_SEG, MIN_SEG, TK_RE } from "@/lib/jogo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ranking do joguinho. Nome único por pessoa (o navegador guarda um segredo `tk`; o servidor guarda só o hash).
 * Redis: jogo:rank:v1 (ZSET nome→melhor pontuação), jogo:nomes (HASH nome minúsculo→como foi digitado),
 * jogo:u:<nome> (hash do segredo), jogo:run:<hash> (hora de início da partida, para limitar pontos por tempo).
 * Sem Redis (desenvolvimento), cai para memória do processo.
 */
const K_RANK = "jogo:rank:v1";
const K_NOMES = "jogo:nomes";
const mem = { rank: new Map<string, number>(), nomes: new Map<string, string>(), dono: new Map<string, string>(), run: new Map<string, number>() };
const usaRedis = () => Boolean(process.env.UPSTASH_REDIS_REST_URL);

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

type Linha = { n: string; p: number };

async function top(limite = 10): Promise<Linha[]> {
  if (!usaRedis()) {
    return [...mem.rank.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limite)
      .map(([k, p]) => ({ n: mem.nomes.get(k) ?? k, p }));
  }
  const z = await redis<string[]>(["ZREVRANGE", K_RANK, 0, limite - 1, "WITHSCORES"]);
  if (!Array.isArray(z) || !z.length) return [];
  const chaves: string[] = [];
  const pts: number[] = [];
  for (let i = 0; i + 1 < z.length; i += 2) {
    chaves.push(String(z[i]));
    pts.push(Number(z[i + 1]) || 0);
  }
  const nomes = await redis<(string | null)[]>(["HMGET", K_NOMES, ...chaves]);
  return chaves.map((k, i) => ({ n: nomes?.[i] ?? k, p: pts[i] }));
}

async function posicao(chave: string): Promise<{ melhor: number; rank: number | null }> {
  if (!usaRedis()) {
    const m = mem.rank.get(chave);
    if (m === undefined) return { melhor: 0, rank: null };
    return { melhor: m, rank: [...mem.rank.values()].filter((v) => v > m).length + 1 };
  }
  const [s, r] = await Promise.all([redis<string>(["ZSCORE", K_RANK, chave]), redis<number>(["ZREVRANK", K_RANK, chave])]);
  return { melhor: s ? Number(s) || 0 : 0, rank: typeof r === "number" ? r + 1 : null };
}

async function donoDe(chave: string): Promise<string | null> {
  return usaRedis() ? await redis<string>(["GET", `jogo:u:${chave}`]) : (mem.dono.get(chave) ?? null);
}

export async function GET() {
  return NextResponse.json({ top: await top(10) }, { headers: { "Cache-Control": "public, s-maxage=3, stale-while-revalidate=8" } });
}

type Body = { acao?: string; nome?: string; tk?: string; pontos?: number };

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const b = await readJson<Body>(req, 512);
  if (!b || typeof b !== "object") return NextResponse.json({ ok: false }, { status: 400 });
  const ip = hashIp(clientIp(req));
  if (await limited(`jogo:${ip}`, 90, 60)) return NextResponse.json({ ok: false, erro: "devagar" }, { status: 429 });

  const nome = typeof b.nome === "string" ? b.nome.trim() : "";
  const tk = typeof b.tk === "string" && TK_RE.test(b.tk) ? b.tk : null;
  const msg = erroNome(nome);
  if (msg || !tk) return NextResponse.json({ ok: false, erro: "nome", msg: msg ?? "Sessão inválida." }, { status: 400 });
  const chave = nome.toLowerCase();
  const hash = sha(tk);

  if (b.acao === "entrar") {
    if (await limited(`jogo:entrar:${ip}`, 30, 3600)) return NextResponse.json({ ok: false, erro: "devagar", msg: "Muitas tentativas. Tente mais tarde." }, { status: 429 });
    let ok: boolean;
    if (usaRedis()) {
      const r = await redis<string>(["SET", `jogo:u:${chave}`, hash, "NX"]);
      ok = r === "OK" || (await donoDe(chave)) === hash;
      if (ok) await redis(["HSET", K_NOMES, chave, nome]);
    } else {
      ok = !mem.dono.has(chave) || mem.dono.get(chave) === hash;
      if (ok) {
        mem.dono.set(chave, hash);
        mem.nomes.set(chave, nome);
      }
    }
    if (!ok) return NextResponse.json({ ok: false, erro: "em-uso", msg: "Esse nome já está em uso. Escolha outro." }, { status: 409 });
    return NextResponse.json({ ok: true, ...(await posicao(chave)) });
  }

  // as demais ações exigem ser o dono do nome
  if ((await donoDe(chave)) !== hash) return NextResponse.json({ ok: false, erro: "dono", msg: "Esse nome pertence a outro aparelho." }, { status: 403 });

  if (b.acao === "inicio") {
    if (usaRedis()) await redis(["SET", `jogo:run:${hash}`, String(Date.now()), "EX", 3600]);
    else mem.run.set(hash, Date.now());
    return NextResponse.json({ ok: true });
  }

  if (b.acao === "pontos") {
    const pontos = Math.floor(Number(b.pontos));
    if (!Number.isFinite(pontos) || pontos < 1 || pontos > 1_000_000) return NextResponse.json({ ok: false, erro: "invalido" }, { status: 400 });
    let ini: number | null;
    if (usaRedis()) {
      const v = await redis<string>(["GETDEL", `jogo:run:${hash}`]);
      ini = v ? Number(v) : null;
    } else {
      ini = mem.run.get(hash) ?? null;
      mem.run.delete(hash);
    }
    const seg = ini ? (Date.now() - ini) / 1000 : 0;
    if (!ini || seg < MIN_SEG || pontos > MAX_PTS_POR_SEG * seg + 100) {
      return NextResponse.json({ ok: false, erro: "invalido", msg: "Pontuação não aceita." }, { status: 422 });
    }
    if (usaRedis()) await redis(["ZADD", K_RANK, "GT", pontos, chave]);
    else if (pontos > (mem.rank.get(chave) ?? 0)) mem.rank.set(chave, pontos);
    return NextResponse.json({ ok: true, ...(await posicao(chave)), top: await top(10) });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}
