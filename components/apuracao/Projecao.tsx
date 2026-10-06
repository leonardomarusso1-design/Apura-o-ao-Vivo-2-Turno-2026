import type { Projecao as P } from "@/lib/apuracao/projection";
import { fmtInt, fmtPct } from "./types";

export default function Projecao({ p, cor }: { p: P; cor: (n: number | undefined) => string }) {
  return (
    <section className="glass-panel rise rounded-2xl p-4 sm:p-5" aria-label="Projeção estatística">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
          <h2 className="text-xs sm:text-sm font-semibold text-paper uppercase tracking-wider">
            Projeção Final
          </h2>
        </div>
        <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
          Estimativa do site, não oficial
        </span>
      </div>

      {!p.disponivel ? (
        <div className="mt-3.5 py-4 text-center rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <p className="text-xs text-mute leading-relaxed max-w-[240px] mx-auto">
            A projeção será liberada assim que os primeiros estados atingirem 2% de urnas apuradas.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3.5 grid gap-2.5">
            {p.cands.slice(0, 2).map((c, i) => (
              <div 
                key={c.n} 
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: cor(c.n), boxShadow: `0 0 8px ${cor(c.n)}` }} 
                  />
                  <div className="min-w-0">
                    <span className="block font-medium text-xs sm:text-sm text-paper truncate">
                      {c.nome}
                    </span>
                    <span className="text-[10px] text-mute">{c.partido}</span>
                  </div>
                </div>
                <div className="tabular text-right">
                  <span className="font-bold text-lg sm:text-xl text-white">{fmtPct(c.pct)}</span>
                  <span className="text-xs text-mute ml-0.5">%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-mute">
            <span>Restante a apurar: <strong className="text-paper">{fmtPct(p.restantePct, 1)}%</strong></span>
            <span>{p.ufsComDados} UFs com base</span>
          </div>

          {p.irreversivel && p.restantePct >= 0.5 ? (
            <div className="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-300">
              <strong className="block font-semibold">Resultado irreversível pelo modelo</strong>
              A vantagem é maior que a soma de todos os votos restantes possíveis ({fmtInt(p.votosRestantesMax)}).
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
