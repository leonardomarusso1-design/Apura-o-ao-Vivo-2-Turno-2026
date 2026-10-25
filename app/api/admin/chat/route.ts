import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { clientIp, hashIp } from "@/lib/ip";
import { limited } from "@/lib/ratelimit";
import { adminOk } from "@/lib/admin";
import { readJson } from "@/lib/security";
import { K_BAN, K_MSGS, K_OFF, K_SUPER_PEND, K_SUPER_RANK, MAX_MSGS, type Msg, type SuperPend } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function porta(req: Request) {
  if (await limited(`admchat:${hashIp(clientIp(req))}`, 60, 60)) return NextResponse.json({ ok: false, erro: "devagar" }, { status: 429 });
  if (!adminOk(req)) return NextResponse.json({ ok: false, erro: "senha" }, { status: 401 });
  return null;
}

async function brutos() {
  const l = (await redis<string[]>(["LRANGE", K_MSGS, 0, 199])) ?? [];
  return l.map((raw) => {
    try {
      return { raw, m: JSON.parse(raw) as Msg };
    } catch {
      return null;
    }
  }).filter((x): x is { raw: string; m: Msg } => Boolean(x));
}

/** Só você: mensagens com uid (para banir) e estado do chat. */
export async function GET(req: Request) {
  const n = await porta(req);
  if (n) return n;
  const [lista, off, pendRaw] = await Promise.all([brutos(), redis<number>(["EXISTS", K_OFF]), redis<string[]>(["HGETALL", K_SUPER_PEND])]);
  const pend: SuperPend[] = [];
  for (let i = 0; i + 1 < (pendRaw?.length ?? 0); i += 2) {
    try {
      pend.push(JSON.parse(pendRaw![i + 1]) as SuperPend);
    } catch {
      /* ignora */
    }
  }
  pend.sort((x, y) => x.t - y.t);
  return NextResponse.json({ ok: true, off: off === 1, msgs: lista.map((x) => x.m), pend });
}

/** Ações: apagar {id}, banir {uid} (apaga tudo dele), desligar / ligar, limpar. */
export async function POST(req: Request) {
  const n = await porta(req);
  if (n) return n;
  const b = await readJson<{ acao?: string; id?: string; uid?: string }>(req, 512);
  if (!b) return NextResponse.json({ ok: false }, { status: 400 });
  if (b.acao === "desligar") await redis(["SET", K_OFF, "1"]);
  else if (b.acao === "ligar") await redis(["DEL", K_OFF]);
  else if (b.acao === "limpar") await redis(["DEL", K_MSGS]);
  else if (b.acao === "apagar" && b.id) {
    const alvo = (await brutos()).find((x) => x.m.id === b.id);
    if (alvo) await redis(["LREM", K_MSGS, 0, alvo.raw]);
  } else if (b.acao === "recusar" && b.id) {
    await redis(["HDEL", K_SUPER_PEND, b.id]);
  } else if (b.acao === "aprovar" && b.id) {
    const raw = await redis<string>(["HGET", K_SUPER_PEND, b.id]);
    let p: SuperPend | null = null;
    try {
      p = raw ? (JSON.parse(raw) as SuperPend) : null;
    } catch {
      p = null;
    }
    if (!p) return NextResponse.json({ ok: false, erro: "sumiu" }, { status: 404 });
    const msg: Msg = { id: `s${p.id}`, t: Date.now(), uid: p.uid, u: p.u, m: p.m, sv: p.v };
    await redis(["LPUSH", K_MSGS, JSON.stringify(msg)]);
    await redis(["LTRIM", K_MSGS, 0, MAX_MSGS - 1]);
    await redis(["ZINCRBY", K_SUPER_RANK, p.v, p.u]);
    await redis(["HDEL", K_SUPER_PEND, b.id]);
  } else if (b.acao === "banir" && b.uid && /^[a-f0-9]{24}$/.test(b.uid)) {
    await redis(["SADD", K_BAN, b.uid]);
    for (const x of await brutos()) if (x.m.uid === b.uid) await redis(["LREM", K_MSGS, 0, x.raw]);
  } else return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true });
}
