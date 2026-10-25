import { NextResponse } from "next/server";
import { redis, redisPipeline } from "@/lib/redis";
import { limited } from "@/lib/ratelimit";
import { forbidden, readJson, sameOrigin } from "@/lib/security";
import { K_BAN, K_MSGS, K_OFF, MAX_MSGS, limparMsg, uidDaSessao, type Msg, type MsgPub } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mem: Msg[] = []; // só para desenvolvimento sem Redis

function parse(x: unknown): Msg | null {
  try {
    return typeof x === "string" ? (JSON.parse(x) as Msg) : null;
  } catch {
    return null;
  }
}

/** Lista pública (cache de CDN de 2 s: milhares de leitores = poucas leituras no Redis). Nunca expõe o uid. */
export async function GET() {
  const r = await redisPipeline([["EXISTS", K_OFF], ["LRANGE", K_MSGS, 0, 59]]);
  const off = r ? r[0] === 1 : false;
  const brutos = r ? ((r[1] as unknown[]) ?? []) : mem.slice(0, 60);
  const msgs: MsgPub[] = (r ? brutos.map(parse) : (brutos as Msg[]))
    .filter((m): m is Msg => Boolean(m))
    .reverse()
    .map(({ id, t, u, m }) => ({ id, t, u, m }));
  return NextResponse.json({ off, msgs }, { headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=4" } });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const uid = uidDaSessao(req.headers.get("cookie"));
  if (!uid) return NextResponse.json({ ok: false, erro: "Entre com o Google para conversar." }, { status: 401 });
  const b = await readJson<{ m?: unknown }>(req, 1024);
  if (!b) return NextResponse.json({ ok: false, erro: "Mensagem inválida." }, { status: 400 });

  const [off, banido, nick] = await Promise.all([
    redis<number>(["EXISTS", K_OFF]),
    redis<number>(["SISMEMBER", K_BAN, uid]),
    redis<string>(["GET", `chat:v1:nick:${uid}`]),
  ]);
  if (off === 1) return NextResponse.json({ ok: false, erro: "O chat está pausado agora." }, { status: 503 });
  if (banido === 1) return NextResponse.json({ ok: false, erro: "Sua conta foi bloqueada do chat." }, { status: 403 });
  if (!nick) return NextResponse.json({ ok: false, erro: "Escolha um apelido para entrar." }, { status: 401 });

  if (await limited(`chat:${uid}`, 15, 60)) return NextResponse.json({ ok: false, erro: "Devagar: muitas mensagens." }, { status: 429 });
  const lim = limparMsg(b.m);
  if (!lim.ok) return NextResponse.json({ ok: false, erro: lim.erro }, { status: 422 });

  // espaçamento mínimo de 2 s e bloqueio de mensagem repetida
  const gap = await redis<string>(["SET", `chat:v1:gap:${uid}`, "1", "NX", "EX", 2]);
  if (gap !== "OK" && process.env.UPSTASH_REDIS_REST_URL) return NextResponse.json({ ok: false, erro: "Espere 2 segundos." }, { status: 429 });
  const ultima = await redis<string>(["GETSET", `chat:v1:last:${uid}`, lim.m]);
  await redis(["EXPIRE", `chat:v1:last:${uid}`, 120]);
  if (ultima === lim.m) return NextResponse.json({ ok: false, erro: "Mensagem repetida." }, { status: 422 });

  const msg: Msg = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, t: Date.now(), uid, u: nick, m: lim.m };
  const ok = await redisPipeline([["LPUSH", K_MSGS, JSON.stringify(msg)], ["LTRIM", K_MSGS, 0, MAX_MSGS - 1]]);
  if (!ok) {
    if (process.env.UPSTASH_REDIS_REST_URL) return NextResponse.json({ ok: false, erro: "Tente de novo." }, { status: 503 });
    mem.unshift(msg);
    mem.length = Math.min(mem.length, MAX_MSGS);
  }
  return NextResponse.json({ ok: true });
}
