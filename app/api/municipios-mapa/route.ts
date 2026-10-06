import { NextResponse } from "next/server";
import { mapaMunicipios } from "@/lib/apuracao/municipios";
import { getSnapshot, turnoDe } from "@/lib/apuracao/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET ?uf=sp&c=1|3|5 => líder de cada município do estado (cache compartilhado). */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const uf = sp.get("uf") ?? "";
  const c = Number(sp.get("c") ?? "1");
  if (!/^[a-z]{2}$/i.test(uf) || (c !== 1 && c !== 3 && c !== 5)) return NextResponse.json({ ok: false }, { status: 400 });
  const snap = c === 1 ? await getSnapshot(turnoDe(req.url)) : null;
  if (snap && snap.status === "aguardando" && !snap.demo) return NextResponse.json({ ok: false }, { headers: { "Cache-Control": "public, s-maxage=20" } }); // 2º turno ainda sem dados: não consulta o TSE
  const ele = snap ? snap.eleicao : 6259;
  const ttl = snap && !snap.previa && !snap.demo ? 120 : 1800; // ao vivo: 2 min; resultado fechado: 30 min
  const r = await mapaMunicipios(ele, c, uf, ttl).catch(() => null);
  if (!r) return NextResponse.json({ ok: false }, { headers: { "Cache-Control": "no-store" } });
  if ("pendente" in r) return NextResponse.json({ ok: true, pendente: true }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ ok: true, ...r }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
}
