"use client";

import { useEffect, useState } from "react";
import { BR_UFS } from "@/lib/br-map";
import { blocoDe, COR_BLOCO } from "@/lib/apuracao/blocos";
import type { CandGov, DisputaGov } from "@/lib/apuracao/governadores";
import Bandeira from "./Bandeira";
import { fmtInt, fmtPct } from "./types";

type Resp = { ok: boolean; r2Aberto: boolean; disputas: DisputaGov[] };

const nomeUf = (uf: string) => BR_UFS.find((u) => u.id.toUpperCase() === uf)?.nome ?? uf;
const iniciais = (nome: string) =>
  nome
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || nome.slice(0, 2).toUpperCase();

/** Cor por partido (mesmo critério do mapa); dois do mesmo bloco ganham tons diferentes. */
function cores(cands: CandGov[]): string[] {
  const usados: Record<string, number> = {};
  return cands.map((c) => {
    const b = blocoDe(c.partido);
    const i = usados[b] ?? 0;
    usados[b] = i + 1;
    return COR_BLOCO[b][Math.min(i, COR_BLOCO[b].length - 1)];
  });
}

function Cartao({ d }: { d: DisputaGov }) {
  const usaR2 = Boolean(d.r2 && d.r2.top.length > 0);
  const base = usaR2 ? d.r2! : d.r1;
  const top = base.top.slice(0, 2);
  const cs = cores(top);
  const dif = top.length > 1 ? top[0].votos - top[1].votos : 0;
  return (
    <article className="glass-panel rounded-2xl p-4" aria-label={`Governo de ${nomeUf(d.uf)}`}>
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Bandeira uf={d.uf} w={26} />
          {nomeUf(d.uf)}
        </h3>
        <span className="rounded-md border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mute">
          {usaR2 ? `2º turno · ${fmtPct(base.pa, 1)}% apurado` : "2º turno em 25/10"}
        </span>
      </header>
      <ul className="mt-3 grid gap-3">
        {top.map((c, i) => (
          <li key={c.n}>
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-ink"
                style={{ background: cs[i] }}
              >
                {iniciais(c.nome)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 block text-sm font-medium">{c.nome}</span>
                <span className="block text-[11px] text-mute">
                  {c.partido} · {c.n}
                </span>
              </span>
              <span className="tabular text-xl font-bold">{fmtPct(c.pct, 1)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="bar-grow h-full" style={{ width: `${c.pct}%`, background: cs[i] }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="tabular mt-3 text-[11px] text-mute">
        {usaR2 ? `Diferença: ${fmtInt(dif)} votos` : `Resultado do 1º turno (${fmtPct(d.r1.pa, 0)}% apurado) · diferença ${fmtInt(dif)} votos`}
      </p>
    </article>
  );
}

export default function Governadores() {
  const [d, setD] = useState<Resp | null>(null);
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const r = await fetch("/api/governadores");
        if (r.ok && alive) setD((await r.json()) as Resp);
      } catch {
        /* tenta de novo */
      }
      if (alive) t = setTimeout(load, 30_000);
    };
    void load();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  if (!d) return <div className="h-64 animate-pulse rounded-2xl border border-line bg-panel" />;
  if (!d.ok || d.disputas.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-panel p-6 text-center text-sm text-mute" role="status">
        Os resultados dos governadores aparecem aqui assim que o TSE divulgar.
      </p>
    );
  }
  const segundo = d.disputas
    .filter((x) => x.segundoTurno)
    .sort((a, b) => {
      const dif = (x: DisputaGov) => {
        const t = (x.r2 ?? x.r1).top;
        return t.length > 1 ? t[0].pct - t[1].pct : 100;
      };
      return dif(a) - dif(b); // as mais apertadas primeiro
    });
  const eleitos = d.disputas.filter((x) => !x.segundoTurno).sort((a, b) => a.uf.localeCompare(b.uf));

  return (
    <div className="grid gap-4">
      <section aria-label="Governadores no 2º turno">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-mute">
          {segundo.length} {segundo.length === 1 ? "estado vai" : "estados vão"} ao 2º turno
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {segundo.map((x) => (
            <Cartao key={x.uf} d={x} />
          ))}
        </div>
      </section>

      {eleitos.length > 0 ? (
        <section className="glass-panel rounded-2xl p-4" aria-label="Eleitos no 1º turno">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-mute">Eleitos no 1º turno</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {eleitos.map((x) => {
              const c = x.r1.top[0];
              if (!c) return null;
              return (
                <li key={x.uf} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                  <Bandeira uf={x.uf} w={22} />
                  <span className="font-semibold">{x.uf}</span>
                  <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                  <span className="tabular text-xs text-mute">{fmtPct(c.pct, 1)}%</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <p className="text-[11px] leading-relaxed text-mute">
        Vai ao 2º turno o estado em que o líder do 1º turno não passou de 50% dos votos válidos. Dados oficiais do TSE.
      </p>
    </div>
  );
}
