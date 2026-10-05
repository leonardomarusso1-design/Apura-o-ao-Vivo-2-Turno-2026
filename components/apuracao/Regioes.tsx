import { BR_UFS, type Regiao } from "@/lib/br-map";
import type { Area } from "@/lib/apuracao/types";
import { fmtPct } from "./types";

const ORDEM: Regiao[] = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];

export default function Regioes({ ufs, cor }: { ufs: Record<string, Area>; cor: (n: number | undefined) => string }) {
  const linhas = ORDEM.map((r) => {
    const ids = BR_UFS.filter((u) => u.regiao === r).map((u) => u.id.toUpperCase());
    const areas = ids.map((i) => ufs[i]).filter(Boolean);
    const ele = areas.reduce((s, a) => s + a.eleitores, 0);
    const apur = areas.reduce((s, a) => s + a.eleitoresApurados, 0);
    const votos = new Map<number, { nome: string; v: number }>();
    for (const a of areas) for (const c of a.cands) {
      const p = votos.get(c.n) ?? { nome: c.nome, v: 0 };
      p.v += c.votos;
      votos.set(c.n, p);
    }
    const total = [...votos.values()].reduce((s, x) => s + x.v, 0);
    const lider = [...votos.entries()].sort((a, b) => b[1].v - a[1].v)[0];
    return { r, pctApur: ele ? (apur / ele) * 100 : 0, lider, pct: total && lider ? (lider[1].v / total) * 100 : 0 };
  });

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5" aria-label="Por região">
      <h2 className="text-sm font-semibold">Por região</h2>
      <ul className="mt-3 grid gap-3">
        {linhas.map((l) => (
          <li key={l.r}>
            <div className="flex items-baseline justify-between text-sm">
              <span>{l.r}</span>
              <span className="tabular text-mute">
                {l.lider && l.pctApur > 0 ? (
                  <>
                    <span style={{ color: cor(l.lider[0]) }}>●</span> {fmtPct(l.pct, 1)}%
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-paper/60" style={{ width: `${l.pctApur}%` }} />
            </div>
            <div className="tabular mt-0.5 text-[11px] text-mute">{fmtPct(l.pctApur, 1)}% do eleitorado apurado</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
