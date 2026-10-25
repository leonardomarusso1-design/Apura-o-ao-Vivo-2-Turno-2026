"use client";

import { useEffect, useMemo, useState } from "react";
import Avatar from "./Avatar";

type Finalista = { n: number; sq?: number; nome: string };
type Item = { uf: string; d: number };

const f1 = (n: number) => n.toFixed(1).replace(".", ",");

/**
 * "O que mudou desde o 1º turno": por estado, quanto o voto dos dois finalistas se moveu.
 * O servidor (/api/mudou) compara só os municípios que já têm voto no 2º turno com o resultado deles no 1º,
 * para a diferença não vir de "as primeiras urnas são de lugares diferentes".
 */
export default function MudouDesde1({ finalistas, cor }: { finalistas: Finalista[]; cor: (n: number | undefined) => string }) {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [x, y] = [...finalistas].sort((p, q) => p.n - q.n); // ordem estável: d > 0 = o de menor número cresceu
  const nx = x?.n;
  const ny = y?.n;

  useEffect(() => {
    if (!nx || !ny) return;
    let vivo = true;
    let t: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const r = await fetch(`/api/mudou?a=${nx}&b=${ny}`);
        if (r.ok) {
          const j = (await r.json()) as { ok: boolean; itens?: Item[] };
          if (vivo && j.ok && j.itens) setItens(j.itens);
        }
      } catch {
        /* tenta de novo no próximo ciclo */
      }
      if (vivo) t = setTimeout(load, 45_000);
    };
    void load();
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [nx, ny]);

  const listaX = useMemo(() => (itens ?? []).filter((i) => i.d >= 0.05).sort((p, q) => q.d - p.d).slice(0, 3), [itens]);
  const listaY = useMemo(() => (itens ?? []).filter((i) => i.d <= -0.05).sort((p, q) => p.d - q.d).slice(0, 3), [itens]);
  const maxAbs = Math.max(2, ...(itens ?? []).map((i) => Math.abs(i.d)));

  if (!x || !y || itens === null) return null;

  const bloco = (c: Finalista, lista: Item[]) => (
    <div key={c.n} className="mt-2">
      <p className="flex items-center gap-2 text-xs font-semibold">
        <Avatar n={c.n} sq={c.sq} nome={c.nome} cor={cor(c.n)} size={20} />
        <span>Onde {c.nome.split(" ")[0]} cresceu</span>
      </p>
      {lista.length === 0 ? (
        <p className="mt-1 text-[11px] text-mute">Nenhum estado até agora</p>
      ) : (
        <ul className="mt-1 grid gap-1">
          {lista.map((i) => (
            <li key={i.uf} className="tabular flex items-center gap-2 text-[11px]">
              <span className="w-8 shrink-0 rounded bg-white/10 px-1 py-0.5 text-center text-[10px] font-bold text-paper">{i.uf}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, (Math.abs(i.d) / maxAbs) * 100)}%`, background: cor(c.n) }} />
              </span>
              <strong className="w-12 shrink-0 text-right" style={{ color: cor(c.n) }}>
                +{f1(Math.abs(i.d))}
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
      <p className="text-[10px] text-mute">Nas urnas já apuradas, em pontos, contra os mesmos municípios no 1º turno.</p>
      {bloco(x, listaX)}
      {bloco(y, listaY)}
    </section>
  );
}
