import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { limited } from "@/lib/ratelimit";
import { forbidden, readJson, sameOrigin } from "@/lib/security";
import { K_BAN, K_OFF, uidDaSessao } from "@/lib/chat";
import { K_RX, REACOES } from "@/lib/chat-stickers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reação flutuante: só incrementa um contador. Exige login (sessão do chat), limita por conta e não vira mensagem. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const uid = uidDaSessao(req.headers.get("cookie"));
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });
  const b = await readJson<{ id?: unknown; n?: unknown }>(req, 256);
  const id = typeof b?.id === "string" ? b.id : "";
  if (!REACOES.some((r) => r.id === id)) return NextResponse.json({ ok: false }, { status: 400 });
  const n = Math.max(1, Math.min(10, Math.floor(Number(b?.n) || 1)));
  if (await limited(`chat:rx:${uid}`, 40, 60)) return NextResponse.json({ ok: false }, { status: 429 });
  const [off, banido] = await Promise.all([redis<number>(["EXISTS", K_OFF]), redis<number>(["SISMEMBER", K_BAN, uid])]);
  if (off === 1 || banido === 1) return NextResponse.json({ ok: false }, { status: 403 });
  await redis(["HINCRBY", K_RX, id, n]);
  return NextResponse.json({ ok: true });
}
