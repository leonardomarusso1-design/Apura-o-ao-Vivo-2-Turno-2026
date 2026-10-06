"use client";

import { useMemo } from "react";
import { BR_UFS } from "@/lib/br-map";
import type { Area } from "@/lib/apuracao/types";
import Avatar from "./Avatar";
import { fmtInt, fmtPct } from "./types";

const nomeUf = (id: string) => BR_UFS.find((u) => u.id.toUpperCase() === id)?.nome ?? id;

/** Painel lateral do candidato: números gerais + onde vai melhor / pior (como no concorrente, mas com a nossa cara). */
export default function PainelCandidato({
  n,
  br,
  ufs,
  cor,
  turno,
  onVoltar,
  onUf,
}: {
  n: number;
  br: Area | null;
  ufs: Record<string, Area>;
  cor: (n: number | undefined) => string;
  turno: 1 | 2;
  onVoltar: () => void;
  onUf: (uf: string) => void;
}) {
  const c = br?.cands.find((x) => x.n === n);
  const lista = useMemo(() => {
    const out: { id: string; pct: number }[] = [];
    for (const [id, a] of Object.entries(ufs)) {
      if (id === "ZZ" || a.pctApurado <= 0) continue;
      const x = a.cands.find((k) => k.n === n);
      if (x) out.push({ id, pct: x.pct });
    }
    return out.sort((a, b) => b.pct - a.pct);
  }, [ufs, n]);
  if (!c || !br) return null;
  const k = cor(n);
  const pos = [...br.cands].sort((a, b) => b.votos - a.votos).findIndex((x) => x.n === n);
  const fechado = br.pctApurado >= 99.99;
  let situacao = "Em apuração";
  if (turno === 1 && fechado) situacao = pos <= 1 ? "Vai ao 2º turno" : "Fora do 2º turno";
  else if (turno === 2 && (br.definidoTse || fechado)) situacao = pos === 0 ? "Eleito" : "Não eleito";
  else if (pos === 0) situacao = "Lidera a apuração";
  const bom = situacao === "Vai ao 2º turno" || situacao === "Eleito" || situacao === "Lidera a apuração";

  const bloco = (titulo: string, itens: { id: string; pct: number }[]) => (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-mute">{titulo}</p>
      <ul className="grid gap-1.5">
        {itens.map((e) => (
          <li key={e.id}>
            <button onClick={() => onUf(e.id)} className="clicavel block w-full px-1 py-0.5 text-left" title={`Ver ${nomeUf(e.id)}`}>
              <span className="flex items-center justify-between text-xs">
                <span className="truncate">{nomeUf(e.id)} <span aria-hidden className="text-mute">›</span></span>
                <strong className="tabular">{fmtPct(e.pct, 1)}%</strong>
              </span>
              <span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full" style={{ width: `${Math.min(100, e.pct)}%`, background: k }} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section className="glass-panel rise rounded-2xl p-3" aria-label={`Candidato ${c.nome}`}>
      <button onClick={onVoltar} className="mb-2 h-7 rounded-lg border border-line px-2.5 text-xs hover:bg-white/5">
        ← Voltar
      </button>
      <div className="flex items-center gap-3">
        <Avatar n={c.n} sq={c.sq} nome={c.nome} cor={k} size={60} />
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight">{c.nome}</p>
          <p className="text-xs" style={{ color: k }}>
            {c.partido} · {c.n} · Presidente
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between border-t border-white/[0.06] pt-3">
        <div>
          <p className="tabular text-3xl font-bold leading-none">
            {fmtPct(c.pct, 2)}
            <span className="text-base text-mute">%</span>
          </p>
          <p className="mt-1 text-[11px] text-mute">dos votos válidos</p>
        </div>
        <p className="tabular text-right text-xs text-mute">
          <strong className="block text-base text-paper">{fmtInt(c.votos)}</strong>votos
        </p>
      </div>
      <dl className="mt-3 grid gap-1 text-xs">
        <div className="flex justify-between">
          <dt className="text-mute">Situação</dt>
          <dd className={`font-semibold ${bom ? "text-emerald-300" : "text-paper"}`}>{situacao}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-mute">Seções apuradas</dt>
          <dd className="tabular font-semibold">{fmtPct(br.pctApurado, 1)}%</dd>
        </div>
      </dl>
      {lista.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-3">
          {bloco("Onde vai melhor", lista.slice(0, 5))}
          {bloco("Onde vai pior", lista.slice(-5).reverse())}
        </div>
      ) : null}
    </section>
  );
}
