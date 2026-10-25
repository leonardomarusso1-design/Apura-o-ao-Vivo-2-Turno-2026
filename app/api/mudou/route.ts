import { NextResponse } from "next/server";
import { mapaMunicipios, type ItemMapa } from "@/lib/apuracao/municipios";
import { ELE_T1, getSnapshot } from "@/lib/apuracao/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const votos = (it: ItemMapa | undefined, n: number) => it?.top.find((x) => x.n === n)?.v;

/**
 * GET ?a=13&b=22 => por estado, quantos pontos o candidato "a" subiu (ou caiu) no 2º turno em relação ao 1º,
 * olhando só os MESMOS municípios que já têm voto no 2º turno (evita o viés de "as primeiras urnas são de lugares diferentes").
 * d > 0: "a" cresceu; d < 0: "b" cresceu. Base: fatia de cada um sobre a soma dos dois.
 * Os dois finalistas dividem os votos dos outros candidatos do 1º turno, então quase todo estado mostra o mesmo sinal.
 * Por isso devolvemos "d" já descontada a média nacional (onde cresceu MAIS ou MENOS que o país) e a média separada.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const a = Number(sp.get("a"));
  const b = Number(sp.get("b"));
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0 || a === b) return NextResponse.json({ ok: false }, { status: 400 });

  const snap = await getSnapshot(2);
  if (snap.demo || snap.previa || snap.status === "aguardando") {
    return NextResponse.json({ ok: true, itens: [] }, { headers: { "Cache-Control": "public, s-maxage=20" } });
  }

  const ufs = Object.values(snap.ufs)
    .filter((x) => x.id !== "ZZ" && x.validos > 0)
    .map((x) => x.id);
  const itens: { uf: string; d: number; v: number }[] = [];
  const t0 = Date.now();
  let i = 0;
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      while (i < ufs.length && Date.now() - t0 < 40_000) {
        const uf = ufs[i++];
        const [r2, r1] = await Promise.all([
          mapaMunicipios(snap.eleicao, 1, uf, 120).catch(() => null),
          mapaMunicipios(ELE_T1, 1, uf, 21_600).catch(() => null),
        ]);
        if (!r2 || !r1 || "pendente" in r2 || "pendente" in r1) continue;
        const m1 = new Map(r1.itens.map((x) => [x.cd, x]));
        let w = 0;
        let real = 0;
        let esperado = 0;
        for (const m of r2.itens) {
          const p = m1.get(m.cd);
          if (!p) continue;
          const a2 = votos(m, a);
          const b2 = votos(m, b);
          const a1 = votos(p, a);
          const b1 = votos(p, b);
          if (a2 === undefined || b2 === undefined || a1 === undefined || b1 === undefined) continue;
          const tot = a2 + b2;
          if (tot <= 0 || a1 + b1 <= 0) continue;
          w += tot;
          real += a2;
          esperado += tot * (a1 / (a1 + b1));
        }
        // só mostra quando os municípios com dados cobrem a maior parte do que o estado já apurou (senão é amostra pequena demais)
        if (w >= 5000 && w >= 0.6 * (snap.ufs[uf]?.validos ?? Infinity)) itens.push({ uf, d: Math.round(((real - esperado) / w) * 1000) / 10, v: w });
      }
    }),
  );

  const pesoTotal = itens.reduce((s, x) => s + x.v, 0);
  const media = pesoTotal > 0 ? itens.reduce((s, x) => s + x.d * x.v, 0) / pesoTotal : 0;
  const relativos = itens.map((x) => ({ ...x, bruto: x.d, d: Math.round((x.d - media) * 10) / 10 }));

  return NextResponse.json(
    { ok: true, geradoEm: new Date().toISOString(), media: Math.round(media * 10) / 10, itens: relativos },
    { headers: { "Cache-Control": "public, s-maxage=45, stale-while-revalidate=60" } },
  );
}
