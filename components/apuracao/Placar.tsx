import type { Area } from "@/lib/apuracao/types";
import { fmtInt, fmtPct } from "./types";
import Avatar from "./Avatar";

export default function Placar({ br, cor }: { br: Area | null; cor: (n: number | undefined) => string }) {
  // Os 2 primeiros por votos, mas SEMPRE na mesma posição (por nº da urna) — evita trocar de lado a cada virada
  const top = (br?.cands.slice(0, 2) ?? []).sort((a, b) => a.n - b.n);
  const resto = br ? br.cands.slice(2) : [];
  const dif = top.length === 2 ? Math.abs(top[0].votos - top[1].votos) : 0;
  const difPct = top.length === 2 ? Math.abs(top[0].pct - top[1].pct) : 0;

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6" aria-label="Placar nacional">
      <div className="grid grid-cols-2 gap-3">
        {(top.length ? top : [null, null]).map((c, i) => (
          <div key={c?.sq ?? i} className={i === 1 ? "text-right" : ""}>
            <div className={`flex items-center gap-2 ${i === 1 ? "flex-row-reverse" : ""}`}>
              {c ? <Avatar n={c.n} nome={c.nome} cor={cor(c.n)} size={44} /> : null}
              <span className="min-w-0">
                <span className="line-clamp-2 block text-sm leading-tight">{c ? c.nome : "—"}</span>
                <span className="block text-[11px] text-mute">{c ? `${c.partido} · ${c.n}` : ""}</span>
              </span>
            </div>
            <div className="tabular mt-3 whitespace-nowrap font-display text-[2rem] leading-none sm:text-5xl lg:text-[2rem] xl:text-4xl 2xl:text-5xl">
              {c ? fmtPct(c.pct) : "––"}
              <span className="text-base text-mute">%</span>
            </div>
            <div className="tabular mt-1 text-xs text-mute">{c ? `${fmtInt(c.votos)} votos` : ""}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-line" aria-hidden>
        {top.map((c) => (
          <div key={c.sq} style={{ width: `${c.pct}%`, background: cor(c.n) }} />
        ))}
      </div>

      {br && top.length === 2 ? (
        <p className="tabular mt-3 text-xs text-mute">
          Diferença: <strong className="text-paper">{fmtPct(difPct)} pontos</strong> · {fmtInt(dif)} votos
          {br.definidoTse ? <span className="ml-2 rounded bg-lime px-1.5 py-0.5 font-semibold text-ink">TSE: definido</span> : null}
        </p>
      ) : null}

      {resto.length > 0 ? (
        <ul className="mt-3 grid gap-1 border-t border-line pt-3 text-xs text-mute">
          {resto.slice(0, 5).map((c) => (
            <li key={c.sq} className="tabular flex justify-between">
              <span className="truncate">{c.nome}</span>
              <span>{fmtPct(c.pct)}%</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
