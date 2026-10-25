import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { limited } from "@/lib/ratelimit";
import { forbidden, readJson, sameOrigin } from "@/lib/security";
import { K_BAN, K_OFF, K_SUPER_PEND, SUPER_VALORES, limparMsg, uidDaSessao, type SuperPend } from "@/lib/chat";
import { STICKER_RE } from "@/lib/chat-stickers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Super chat: a pessoa paga o Pix e registra o recado aqui. Nada aparece no chat até VOCÊ conferir o Pix e aprovar em /admin/chat. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const uid = uidDaSessao(req.headers.get("cookie"));
  if (!uid) return NextResponse.json({ ok: false, erro: "Entre com o Google para enviar." }, { status: 401 });
  const b = await readJson<{ m?: unknown; v?: unknown }>(req, 1024);
  const v = Number(b?.v);
  if (!b || !SUPER_VALORES.includes(v)) return NextResponse.json({ ok: false, erro: "Valor inválido." }, { status: 400 });
  const [off, banido, nick] = await Promise.all([
    redis<number>(["EXISTS", K_OFF]),
    redis<number>(["SISMEMBER", K_BAN, uid]),
    redis<string>(["GET", `chat:v1:nick:${uid}`]),
  ]);
  if (off === 1) return NextResponse.json({ ok: false, erro: "O chat está pausado agora." }, { status: 503 });
  if (banido === 1 || !nick) return NextResponse.json({ ok: false, erro: "Não foi possível enviar." }, { status: 403 });
  if (await limited(`chatsuper:${uid}`, 4, 600)) return NextResponse.json({ ok: false, erro: "Muitos envios. Aguarde alguns minutos." }, { status: 429 });
  if (typeof b.m === "string" && STICKER_RE.test(b.m)) return NextResponse.json({ ok: false, erro: "Escreva um recado." }, { status: 422 });
  const lim = limparMsg(b.m);
  if (!lim.ok) return NextResponse.json({ ok: false, erro: lim.erro }, { status: 422 });
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const p: SuperPend = { id, t: Date.now(), uid, u: nick, m: lim.m, v };
  await redis(["HSET", K_SUPER_PEND, id, JSON.stringify(p)]);
  await redis(["EXPIRE", K_SUPER_PEND, 86400]);
  return NextResponse.json({ ok: true });
}
