import { NextResponse } from "next/server";
import { getSnapshot, turnoDe } from "@/lib/apuracao/snapshot";
import { getExterior } from "@/lib/apuracao/exterior";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const snap = await getSnapshot(turnoDe(req.url));
  // Sem dados reais (demo/aguardando): não consulta o TSE
  const data = snap.demo || snap.status === "aguardando" ? null : await getExterior(snap.eleicao, snap.previa);
  return NextResponse.json(
    { ok: Boolean(data), geradoEm: data?.geradoEm ?? null, cidades: data?.cidades ?? {} },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
