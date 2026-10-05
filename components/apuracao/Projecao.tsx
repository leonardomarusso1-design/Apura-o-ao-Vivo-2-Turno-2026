import type { Projecao as P } from "@/lib/apuracao/projection";
import { fmtInt, fmtPct } from "./types";

export default function Projecao({ p, cor }: { p: P; cor: (n: number | undefined) => string }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5" aria-label="Projeção">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Projeção do resultado final</h2>
        <span className="rounded border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-mute">estimativa</span>
      </div>
      {!p.disponivel ? (
        <p className="mt-3 text-sm text-mute">A projeção aparece assim que os primeiros estados passarem de 2% apurado.</p>
      ) : (
        <>
          <ul className="mt-3 grid gap-2">
            {p.cands.slice(0, 2).map((c) => (
              <li key={c.n} className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cor(c.n) }} />
                  <span className="truncate">{c.nome}</span>
                </span>
                <span className="tabular font-display text-2xl">{fmtPct(c.pct)}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-mute">
            Calculada estado por estado, mantendo a proporção atual de cada um até o fim (os estados são apurados em
            ritmos diferentes). Faltam <strong className="text-paper">{fmtPct(p.restantePct, 1)}%</strong> do eleitorado.
            Base: {p.ufsComDados} localidades com dados suficientes.
          </p>
          {p.irreversivel ? (
            <p className="mt-2 rounded-lg border border-lime/40 px-3 py-2 text-xs text-lime">
              Diferença maior que o máximo de votos que ainda podem entrar ({fmtInt(p.votosRestantesMax)}). Cálculo do
              site — o resultado oficial é o do TSE.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
