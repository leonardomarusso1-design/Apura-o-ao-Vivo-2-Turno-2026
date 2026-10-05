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
    <section className="glass-panel rise rounded-2xl p-4 sm:p-5" aria-label="Por região">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-paper">
          Votação por Região
        </h2>
        <span className="text-[10px] text-mute uppercase tracking-widest">
          Brasil
        </span>
      </div>

      <ul className="grid gap-2.5">
        {linhas.map((l) => (
          <li key={l.r} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-paper">{l.r}</span>
              <span className="tabular text-xs">
                {l.lider && l.pctApur > 0 ? (
                  <span className="flex items-center gap-1.5 font-medium">
                    <span 
                      className="w-2 h-2 rounded-full inline-block" 
                      style={{ backgroundColor: cor(l.lider[0]) }} 
                    />
                    <span className="text-paper">{fmtPct(l.pct, 1)}%</span>
                  </span>
                ) : (
                  <span className="text-mute font-normal">—</span>
                )}
              </span>
            </div>
            
            {/* Barra de apuração da região */}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40 border border-white/[0.04]">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                style={{ width: `${l.pctApur}%` }} 
              />
            </div>
            
            <div className="tabular mt-1.5 flex items-center justify-between text-[10px] text-mute">
              <span>{fmtPct(l.pctApur, 1)}% apurado</span>
              {l.lider && l.pctApur > 0 ? (
                <span className="text-paper/80 font-medium truncate max-w-[130px]">
                  {l.lider[1].nome} lidera
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
