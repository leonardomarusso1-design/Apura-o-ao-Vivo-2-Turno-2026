import { NextResponse } from "next/server";
import { getSnapshot, turnoDe } from "@/lib/apuracao/snapshot";
import { getExterior } from "@/lib/apuracao/exterior";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const snap = await getSnapshot(turnoDe(req.url));
  // Sem dados reais (demo/aguardando): não consulta o TSE
  // "aguardando" = Brasil com 0%. Mas o exterior pode já ter cidades apuradas (ZZ > 0%): nesse caso busca mesmo assim.
  const extJaTem = (snap.ufs?.["ZZ"]?.pctApurado ?? 0) > 0;
  const data = snap.demo || (snap.status === "aguardando" && !extJaTem) ? null : await getExterior(snap.eleicao, snap.previa, extJaTem);
  return NextResponse.json(
    { ok: Boolean(data), geradoEm: data?.geradoEm ?? null, cidades: data?.cidades ?? {} },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
