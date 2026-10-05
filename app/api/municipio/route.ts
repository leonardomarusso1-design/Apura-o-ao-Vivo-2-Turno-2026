import { NextResponse } from "next/server";
import { listarMunicipios, resultadoMunicipio } from "@/lib/apuracao/municipios";
import { getSnapshot } from "@/lib/apuracao/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const UFS = /^[a-z]{2}$/i;

/** GET ?uf=sp            => lista de municípios
 *  GET ?uf=sp&cd=71072&c=1|3|5 => resultado do município (c: cargo) */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const uf = sp.get("uf") ?? "";
  if (!UFS.test(uf)) return NextResponse.json({ ok: false }, { status: 400 });
  const cd = sp.get("cd");
  if (!cd) {
    const lista = await listarMunicipios(uf);
    return NextResponse.json({ ok: lista.length > 0, municipios: lista }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  }
  const c = Number(sp.get("c") ?? "1");
  if (!/^\d{1,6}$/.test(cd) || (c !== 1 && c !== 3 && c !== 5)) return NextResponse.json({ ok: false }, { status: 400 });
  const ele = c === 1 ? (await getSnapshot()).eleicao : 6259; // presidente: rodada exibida; demais: eleição estadual 1º turno
  const r = await resultadoMunicipio(ele, c, uf, cd);
  return NextResponse.json({ ok: Boolean(r), res: r }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
