import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { clientIp, hashIp } from "@/lib/ip";
import { limited } from "@/lib/ratelimit";
import { forbidden, readJson, sameOrigin } from "@/lib/security";
import { K_BAN, K_NICKS, assinar, clientId, cookieSessao, erroApelido, uidDe } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Info = { aud?: string; iss?: string; sub?: string; email_verified?: string | boolean; exp?: string };

/** Entrar com Google: confere o token no Google, cria a sessão (cookie assinado) e grava o apelido. Não guardamos e-mail. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  if (await limited(`chatlogin:${hashIp(clientIp(req))}`, 20, 60)) return NextResponse.json({ ok: false, erro: "Muitas tentativas. Espere 1 minuto." }, { status: 429 });
  const b = await readJson<{ credential?: string; nick?: string }>(req, 4096);
  const cid = clientId();
  if (!b || typeof b.credential !== "string" || b.credential.length < 100 || b.credential.length > 3000 || !cid)
    return NextResponse.json({ ok: false, erro: "Login indisponível." }, { status: 400 });

  let info: Info | null = null;
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(b.credential)}`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (r.ok) info = (await r.json()) as Info;
  } catch {
    /* cai abaixo */
  }
  const issOk = info?.iss === "accounts.google.com" || info?.iss === "https://accounts.google.com";
  const verif = info?.email_verified === true || info?.email_verified === "true";
  if (!info?.sub || info.aud !== cid || !issOk || !verif || Number(info.exp) < Date.now() / 1000)
    return NextResponse.json({ ok: false, erro: "Não consegui confirmar sua conta Google." }, { status: 401 });

  const uid = uidDe(info.sub);
  if ((await redis<number>(["SISMEMBER", K_BAN, uid])) === 1) return NextResponse.json({ ok: false, erro: "Sua conta foi bloqueada do chat." }, { status: 403 });

  let nick = await redis<string>(["GET", `chat:v1:nick:${uid}`]);
  if (!nick) {
    const pedido = typeof b.nick === "string" ? b.nick.trim() : "";
    const e = erroApelido(pedido);
    if (e) return NextResponse.json({ ok: false, erro: e, precisaApelido: true }, { status: 422 });
    const chave = pedido.toLowerCase();
    const novo = await redis<number>(["HSETNX", K_NICKS, chave, uid]);
    if (novo !== 1) {
      const dono = await redis<string>(["HGET", K_NICKS, chave]);
      if (dono !== uid) return NextResponse.json({ ok: false, erro: "Esse apelido já está em uso.", precisaApelido: true }, { status: 409 });
    }
    await redis(["SET", `chat:v1:nick:${uid}`, pedido]);
    nick = pedido;
  }

  const token = assinar(uid);
  if (!token) return NextResponse.json({ ok: false, erro: "Chat não configurado." }, { status: 503 });
  const res = NextResponse.json({ ok: true, nick });
  res.headers.append("Set-Cookie", cookieSessao(token));
  return res;
}

/** Sair. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", cookieSessao(null));
  return res;
}
