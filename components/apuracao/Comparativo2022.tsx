import { NOMES_2022, V2022 } from "@/lib/apuracao/eleicao2022";
import type { Area } from "@/lib/apuracao/types";

const f1 = (n: number) => n.toFixed(1).replace(".", ",");

/**
 * Compara com 2022 pelo número na urna (13 = campo do PT, 22 = campo do PL…).
 * Percentual sobre votos válidos, mesmo turno. Fonte: TSE (votação por candidato, município e zona, 2022).
 */
export default function Comparativo2022({ area, turno, cor, rotulo }: { area: Area; turno: 1 | 2; cor: (n: number | undefined) => string; rotulo: string }) {
  const base = V2022[turno === 1 ? "1" : "2"]?.[area.id === "BR" ? "BR" : area.id];
  if (!base || area.cands.length === 0 || area.pctApurado <= 0) return null;
  const total = Object.values(base).reduce((a, b) => a + b, 0);
  if (!total) return null;
  const linhas = area.cands
    .slice(0, 3)
    .map((c) => {
      const v = base[String(c.n)];
      if (v === undefined) return null;
      const antes = (v / total) * 100;
      return { n: c.n, nome: c.nome, antes, agora: c.pct, dif: c.pct - antes, nome22: NOMES_2022[String(c.n)] ?? "" };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (linhas.length === 0) return null;
  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3" aria-label={`Comparação com 2022 — ${rotulo}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-mute">Mesmo partido/número em 2022 · {turno}º turno</p>
      <ul className="mt-2 grid gap-1.5 text-xs">
        {linhas.map((l) => (
          <li key={l.n} className="tabular flex items-center justify-between gap-2">
            <span className="min-w-0 truncate" style={{ color: cor(l.n) }}>
              {l.nome22 ? `${l.nome22} (2022)` : `Nº ${l.n} (2022)`} → {l.nome}
            </span>
            <span className="shrink-0 text-paper">
              {f1(l.antes)}% → {f1(l.agora)}%{" "}
              <span className={l.dif >= 0 ? "text-[#30a46c]" : "text-[#e5484d]"}>
                {l.dif >= 0 ? "+" : "−"}
                {f1(Math.abs(l.dif))} p.p.
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
