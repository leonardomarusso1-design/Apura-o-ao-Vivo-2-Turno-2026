import type { Area } from "@/lib/apuracao/types";
import { fmtInt, fmtPct } from "./types";

const milhoes = (n: number) => (n >= 1e6 ? `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n / 1e6)} mi` : fmtInt(n));

/** Brancos, nulos, abstenção e o que ainda falta apurar. Vale para a parte já apurada e se completa conforme as urnas chegam. */
export default function Participacao({ br }: { br: Area }) {
  const comeco = br.eleitoresApurados <= 0 || br.pctApurado <= 0;
  const encerrada = br.pctApurado >= 99.9;
  const base = br.eleitoresApurados > 0 ? br.eleitoresApurados : br.eleitores; // o % de comparecimento do TSE vale sobre o que já foi apurado
  const comp = br.comparecimento;
  const votantes = br.validos + br.brancos + br.nulos;
  const pctDe = (n: number) => (votantes > 0 ? (n / votantes) * 100 : 0);
  const faltamEleitores = Math.max(0, br.eleitores - br.eleitoresApurados);
  const faltamSecoes = Math.max(0, br.secoesTotal - br.secoesApuradas);
  const trav = "—";

  const itens: { n: string; v: string; sub?: string }[] = [
    { n: "Votos nulos", v: comeco ? trav : `${fmtPct(pctDe(br.nulos), 2)}%`, sub: comeco ? undefined : `${fmtInt(br.nulos)} votos` },
    { n: "Votos brancos", v: comeco ? trav : `${fmtPct(pctDe(br.brancos), 2)}%`, sub: comeco ? undefined : `${fmtInt(br.brancos)} votos` },
    { n: "Abstenção", v: comeco ? trav : `${fmtPct(Math.max(0, 100 - comp), 2)}%`, sub: comeco ? undefined : `${fmtInt(base * (1 - comp / 100))} eleitores` },
    { n: "Comparecimento", v: comeco ? trav : `${fmtPct(comp, 2)}%`, sub: comeco ? undefined : `${fmtInt(base * (comp / 100))} eleitores` },
    { n: "Falta apurar", v: br.secoesTotal ? `${fmtPct(Math.max(0, 100 - br.pctApurado), 2)}%` : trav, sub: br.secoesTotal ? `${fmtInt(faltamSecoes)} seções` : undefined },
    { n: "Eleitores a apurar", v: br.eleitores ? milhoes(faltamEleitores) : trav, sub: br.eleitores ? `de ${milhoes(br.eleitores)}` : undefined },
  ];
  return (
    <section className="glass-panel rise rounded-xl p-3" aria-label="Brancos, nulos, abstenção e o que falta apurar">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-paper">Nulos, brancos e abstenção</h2>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-mute">
          {encerrada ? "Apuração encerrada" : comeco ? "Aguardando urnas" : "Parcial"}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-1.5">
        {itens.map((i) => (
          <div key={i.n} className="rounded-lg border border-white/[0.05] bg-white/[0.03] px-2 py-1.5">
            <dt className="text-[9px] uppercase tracking-wide text-mute">{i.n}</dt>
            <dd className="tabular text-base font-bold leading-tight text-white">{i.v}</dd>
            {i.sub ? <dd className="tabular text-[10px] text-mute">{i.sub}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
