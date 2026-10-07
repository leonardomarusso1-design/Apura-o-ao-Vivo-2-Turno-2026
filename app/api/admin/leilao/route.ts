import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { clientIp, hashIp } from "@/lib/ip";
import { limited } from "@/lib/ratelimit";
import { adminOk } from "@/lib/admin";
import { COTAS, ENCERRA_ISO, K_LANCES, K_RANK, type Lance } from "@/lib/leilao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Só você: lista de lances do maior para o menor, com os contatos. Senha = ADMIN_SECRET (Bearer). */
export async function GET(req: Request) {
  if (await limited(`admleilao:${hashIp(clientIp(req))}`, 20, 60)) return NextResponse.json({ ok: false, erro: "devagar" }, { status: 429 });
  if (!adminOk(req)) return NextResponse.json({ ok: false, erro: "senha" }, { status: 401 });

  const ids = await redis<string[]>(["ZREVRANGE", K_RANK, 0, 199]);
  if (ids === null) return NextResponse.json({ ok: false, erro: "redis" }, { status: 503 });
  let lances: Lance[] = [];
  if (ids.length) {
    const brutos = await redis<(string | null)[]>(["HMGET", K_LANCES, ...ids]);
    lances = (brutos ?? []).flatMap((x) => {
      try {
        return x ? [JSON.parse(x) as Lance] : [];
      } catch {
        return [];
      }
    });
    // ZSET já vem por valor; em empate, quem deu primeiro fica na frente
    lances.sort((a, b) => b.valor - a.valor || a.tsPrimeiro - b.tsPrimeiro);
  }
  return NextResponse.json({ ok: true, encerra: ENCERRA_ISO, cotas: COTAS, lances }, { headers: { "Cache-Control": "no-store" } });
}
