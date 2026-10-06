import type { Area } from "@/lib/apuracao/types";
import { fmtInt, fmtPct } from "./types";

/** Apuração encerrada: no lugar da projeção (que seria igual ao placar), mostra a participação do eleitorado. */
export default function Participacao({ br }: { br: Area }) {
  const comp = br.comparecimento;
  const votantes = br.validos + br.brancos + br.nulos;
  const pctDe = (n: number) => (votantes > 0 ? (n / votantes) * 100 : 0);
  const itens: { n: string; v: string; sub?: string }[] = [
    { n: "Comparecimento", v: `${fmtPct(comp, 2)}%`, sub: br.eleitores ? `de ${fmtInt(br.eleitores)} eleitores` : undefined },
    { n: "Abstenção", v: `${fmtPct(Math.max(0, 100 - comp), 2)}%`, sub: br.eleitores ? `${fmtInt(br.eleitores * (1 - comp / 100))} eleitores` : undefined },
    { n: "Votos brancos", v: `${fmtPct(pctDe(br.brancos), 2)}%`, sub: `${fmtInt(br.brancos)} votos` },
    { n: "Votos nulos", v: `${fmtPct(pctDe(br.nulos), 2)}%`, sub: `${fmtInt(br.nulos)} votos` },
  ];
  return (
    <section className="glass-panel rise rounded-2xl p-4 sm:p-5" aria-label="Participação do eleitorado">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-paper sm:text-sm">Participação</h2>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-mute">
          Apuração encerrada
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        {itens.map((i) => (
          <div key={i.n} className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-2.5">
            <dt className="text-[10px] uppercase tracking-wide text-mute">{i.n}</dt>
            <dd className="tabular mt-0.5 text-lg font-bold text-white">{i.v}</dd>
            {i.sub ? <dd className="tabular text-[10px] text-mute">{i.sub}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
