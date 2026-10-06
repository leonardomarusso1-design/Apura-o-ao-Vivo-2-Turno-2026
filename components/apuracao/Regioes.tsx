import { BR_UFS, type Regiao } from "@/lib/br-map";
import type { Area } from "@/lib/apuracao/types";
import { fmtPct } from "./types";

const ORDEM: Regiao[] = ["Sudeste", "Nordeste", "Sul", "Norte", "Centro-Oeste"];

export default function Regioes({ ufs, cor }: { ufs: Record<string, Area>; cor: (n: number | undefined) => string }) {
  const linhas = ORDEM.map((r) => {
    const ids = BR_UFS.filter((u) => u.regiao === r).map((u) => u.id.toUpperCase());
    const areas = ids.map((i) => ufs[i]).filter(Boolean);
    const ele = areas.reduce((s, a) => s + a.eleitores, 0);
    const apur = areas.reduce((s, a) => s + a.eleitoresApurados, 0);
    const votos = new Map<number, { nome: string; v: number }>();
    for (const a of areas) {
      for (const c of a.cands) {
        const p = votos.get(c.n) ?? { nome: c.nome, v: 0 };
        p.v += c.votos;
        votos.set(c.n, p);
      }
    }
    const total = [...votos.values()].reduce((s, x) => s + x.v, 0);
    const lider = [...votos.entries()].sort((a, b) => b[1].v - a[1].v)[0];
    return { r, pctApur: ele ? (apur / ele) * 100 : 0, lider, pct: total && lider ? (lider[1].v / total) * 100 : 0 };
  });

  return (
    <section className="glass-panel rise rounded-2xl p-3 sm:p-4 [@media(max-height:820px)]:sm:p-3" aria-label="Por região">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-paper sm:text-sm">Votação por região</h2>
        <span className="text-[10px] uppercase tracking-widest text-mute">Brasil</span>
      </div>
      <ul className="grid gap-1.5">
        {linhas.map((l) => (
          <li key={l.r} className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-2.5 py-1.5 [@media(max-height:820px)]:py-1" title={l.lider && l.pctApur > 0 ? `${l.lider[1].nome} lidera · ${fmtPct(l.pctApur, 1)}% apurado` : undefined}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-paper">{l.r}</span>
              <span className="tabular flex items-center gap-1.5">
                {l.lider && l.pctApur > 0 ? (
                  <>
                    <span className="hidden max-w-[110px] truncate text-[10px] text-mute xl:inline">{l.lider[1].nome}</span>
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: cor(l.lider[0]) }} />
                    <span className="font-medium text-paper">{fmtPct(l.pct, 1)}%</span>
                  </>
                ) : (
                  <span className="text-mute">—</span>
                )}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 [@media(max-height:820px)]:mt-0.5">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/40">
                <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${l.pctApur}%` }} />
              </div>
              <span className="tabular text-[10px] text-mute [@media(max-height:820px)]:hidden">{fmtPct(l.pctApur, 0)}% apurado</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
