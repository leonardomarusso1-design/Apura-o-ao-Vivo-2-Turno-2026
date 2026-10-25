"use client";

import { useEffect, useMemo, useState } from "react";
import type { Area } from "@/lib/apuracao/types";
import Avatar from "./Avatar";

type Finalista = { n: number; sq?: number; nome: string };

const f1 = (n: number) => n.toFixed(1).replace(".", ",");
const MIN_APURADO = 1; // só compara estados com pelo menos 1% das seções totalizadas

/**
 * "O que mudou desde o 1º turno": por estado, quanto o voto dos dois finalistas se moveu.
 * Base: no 1º turno, a fatia de cada um sobre a soma dos dois; agora, o % dos votos válidos do 2º turno.
 * Só conta as urnas já apuradas, então no começo da apuração os números oscilam bastante.
 */
export default function MudouDesde1({ ufs, finalistas, cor }: { ufs: Record<string, Area> | undefined; finalistas: Finalista[]; cor: (n: number | undefined) => string }) {
  const [r1, setR1] = useState<Record<string, Area> | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/apuracao?t=1")
      .then((r) => (r.ok ? (r.json() as Promise<{ ufs?: Record<string, Area> }>) : null))
      .then((j) => {
        if (vivo && j?.ufs) setR1(j.ufs);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  const [a, b] = finalistas;

  // d > 0: o 1º finalista da lista cresceu no estado; d < 0: o 2º cresceu
  const difs = useMemo(() => {
    const out: { uf: string; d: number }[] = [];
    if (!r1 || !ufs || !a || !b) return out;
    for (const [uf, atual] of Object.entries(ufs)) {
      if (uf === "ZZ" || atual.pctApurado < MIN_APURADO || atual.validos <= 0) continue;
      const ca = atual.cands.find((c) => c.n === a.n);
      const ant = r1[uf];
      const va = ant?.cands.find((c) => c.n === a.n)?.votos;
      const vb = ant?.cands.find((c) => c.n === b.n)?.votos;
      if (!ca || va === undefined || vb === undefined || va + vb <= 0) continue;
      out.push({ uf, d: ca.pct - (va / (va + vb)) * 100 });
    }
    return out;
  }, [r1, ufs, a, b]);

  if (!a || !b || !r1) return null;

  const listaA = difs.filter((x) => x.d >= 0.05).sort((x, y) => y.d - x.d).slice(0, 3);
  const listaB = difs.filter((x) => x.d <= -0.05).sort((x, y) => x.d - y.d).slice(0, 3);
  const maxAbs = Math.max(2, ...difs.map((x) => Math.abs(x.d)));

  const bloco = (c: Finalista, lista: { uf: string; d: number }[]) => (
    <div key={c.n} className="mt-2">
      <p className="flex items-center gap-2 text-xs font-semibold">
        <Avatar n={c.n} sq={c.sq} nome={c.nome} cor={cor(c.n)} size={20} />
        <span>Onde {c.nome.split(" ")[0]} cresceu</span>
      </p>
      {lista.length === 0 ? (
        <p className="mt-1 text-[11px] text-mute">Nenhum estado até agora</p>
      ) : (
        <ul className="mt-1 grid gap-1">
          {lista.map((x) => (
            <li key={x.uf} className="tabular flex items-center gap-2 text-[11px]">
              <span className="w-8 shrink-0 rounded bg-white/10 px-1 py-0.5 text-center text-[10px] font-bold text-paper">{x.uf}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, (Math.abs(x.d) / maxAbs) * 100)}%`, background: cor(c.n) }} />
              </span>
              <strong className="w-12 shrink-0 text-right" style={{ color: cor(c.n) }}>
                +{f1(Math.abs(x.d))}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section className="glass-panel rounded-xl p-3" aria-label="O que mudou desde o 1º turno">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-paper">O que mudou desde o 1º turno</h2>
      <p className="text-[10px] text-mute">Em pontos, sobre o voto dos dois finalistas, nas urnas já apuradas.</p>
      {bloco(a, listaA)}
      {bloco(b, listaB)}
    </section>
  );
}
