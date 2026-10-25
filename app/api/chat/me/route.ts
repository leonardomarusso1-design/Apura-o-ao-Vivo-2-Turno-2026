import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { K_BAN, uidDaSessao } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quem sou eu (só lê o cookie da sessão). Sem cache. */
export async function GET(req: Request) {
  const uid = uidDaSessao(req.headers.get("cookie"));
  const h = { "Cache-Control": "no-store" };
  if (!uid) return NextResponse.json({ logado: false }, { headers: h });
  const [nick, banido] = await Promise.all([redis<string>(["GET", `chat:v1:nick:${uid}`]), redis<number>(["SISMEMBER", K_BAN, uid])]);
  if (!nick || banido === 1) return NextResponse.json({ logado: false, banido: banido === 1 }, { headers: h });
  return NextResponse.json({ logado: true, nick }, { headers: h });
}
