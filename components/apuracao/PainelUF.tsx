import { BR_UFS } from "@/lib/br-map";
import type { Area } from "@/lib/apuracao/types";
import { fmtInt, fmtPct } from "./types";

export default function PainelUF({
  uf,
  area,
  cor,
  onClose,
}: {
  uf: string;
  area: Area | undefined;
  cor: (n: number | undefined) => string;
  onClose: () => void;
}) {
  const nome = BR_UFS.find((u) => u.id.toUpperCase() === uf)?.nome ?? uf;
  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5" aria-label={`Resultado em ${nome}`}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl">{nome}</h2>
          <p className="tabular text-xs text-mute">
            {area ? `${fmtPct(area.pctApurado, 1)}% das seções apuradas · ${fmtInt(area.eleitores)} eleitores` : "Ainda sem dados do TSE"}
          </p>
        </div>
        <button onClick={onClose} className="h-9 rounded-lg border border-line px-3 text-xs" aria-label="Fechar">
          Fechar
        </button>
      </div>
      {area ? (
        <ul className="mt-4 grid gap-3">
          {area.cands.slice(0, 4).map((c) => (
            <li key={c.sq}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: cor(c.n) }} />
                  {c.nome}
                </span>
                <span className="tabular">{fmtPct(c.pct)}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full" style={{ width: `${c.pct}%`, background: cor(c.n) }} />
              </div>
              <div className="tabular mt-0.5 text-[11px] text-mute">{fmtInt(c.votos)} votos</div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
