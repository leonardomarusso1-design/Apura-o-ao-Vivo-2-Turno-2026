"use client";

import { useEffect, useMemo, useState } from "react";
import { BR_UFS } from "@/lib/br-map";
import { blocoDe, COR_BLOCO } from "@/lib/apuracao/blocos";
import type { CandGov, DisputaGov } from "@/lib/apuracao/governadores";
import Bandeira from "./Bandeira";
import Avatar from "./Avatar";
import MunicipioBusca from "./MunicipioBusca";
import MapaMunicipios from "./MapaMunicipios";
import MapaBR from "./MapaBR";
import { mkArea } from "./mapaAreas";
import { fmtInt, fmtPct, makeCor } from "./types";

type Resp = { ok: boolean; r2Aberto: boolean; disputas: DisputaGov[] };

const nomeUf = (uf: string) => BR_UFS.find((u) => u.id.toUpperCase() === uf)?.nome ?? uf;

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

function Cartao({ d, semMapa = false }: { d: DisputaGov; semMapa?: boolean }) {
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
              <Avatar n={c.n} sq={c.sq} nome={c.nome} cor={cs[i]} size={36} />
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
      {semMapa ? null : <MapaMunicipios uf={d.uf} cargo={3} />}
      <MunicipioBusca uf={d.uf} cargo={3} cor={(n) => cs[top.findIndex((c) => c.n === n)] ?? "#8a9792"} />
    </article>
  );
}

export default function Governadores() {
  const [d, setD] = useState<Resp | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const { areas, corMapa } = useMemo(() => {
    const out: Record<string, ReturnType<typeof mkArea>> = {};
    const todos: { n: number; partido: string }[] = [];
    for (const x of d?.disputas ?? []) {
      const base = x.r2 && x.r2.top.length ? x.r2 : x.r1;
      const cands = base.top.map((c) => ({ sq: c.sq ?? c.n, n: c.n, nome: c.nome, partido: c.partido, votos: c.votos, pct: c.pct, eleito: false }));
      todos.push(...cands.map((c) => ({ n: c.n, partido: c.partido })));
      out[x.uf] = mkArea(x.uf, cands);
    }
    return { areas: out, corMapa: makeCor(todos) };
  }, [d]);
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

  const escolhido = sel ? d.disputas.find((x) => x.uf === sel) : undefined;
  const linha = (x: DisputaGov) => {
    const base = x.r2 && x.r2.top.length ? x.r2 : x.r1;
    const top = base.top.slice(0, 2);
    const cs = cores(top);
    return (
      <li key={x.uf}>
        <button onClick={() => setSel(x.uf)} className="flex w-full items-center gap-2 rounded-xl border border-line px-2.5 py-1.5 text-left transition hover:bg-white/5">
          <Bandeira uf={x.uf} w={22} />
          <span className="w-6 text-xs font-semibold">{x.uf}</span>
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {top.map((c, i) => (
              <span key={c.n} className="flex min-w-0 items-center gap-1.5" title={c.nome}>
                <Avatar n={c.n} sq={c.sq} nome={c.nome} cor={cs[i]} size={28} />
                <span className="tabular text-xs font-bold">{fmtPct(c.pct, 1)}%</span>
              </span>
            ))}
          </span>
        </button>
      </li>
    );
  };
  return (
    <div className="grid gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
      <section className="glass-panel flex min-h-[420px] flex-col rounded-2xl p-3 lg:min-h-0" aria-label="Mapa dos governos">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-paper sm:text-sm">
            {eleitos.length} eleitos · {segundo.length} no 2º turno
          </h2>
          <ul className="flex flex-wrap gap-3 text-xs text-mute">
            {(["esquerda", "centro", "direita", "outros"] as const).map((b) => (
              <li key={b} className="flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: COR_BLOCO[b][0] }} />
                {b === "esquerda" ? "Esquerda" : b === "direita" ? "Direita" : b === "centro" ? "Centrão" : "Outros"}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative min-h-[340px] flex-1 lg:min-h-0">
          {escolhido ? (
            <div className="flex h-full flex-col">
              <div>
                <button onClick={() => setSel(null)} className="h-8 rounded-lg border border-line px-3 text-xs hover:bg-white/5">
                  ← Brasil
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <MapaMunicipios uf={escolhido.uf} cargo={3} inicial fit />
              </div>
            </div>
          ) : (
            <MapaBR ufs={areas} cor={corMapa} selecionada={sel} onSelect={(u) => setSel(u === sel ? null : u)} fit />
          )}
        </div>
      </section>

      <aside className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto lg:pr-1">
        {escolhido ? (
          <Cartao d={escolhido} semMapa />
        ) : (
          <>
            <section aria-label="Governadores no 2º turno" className="glass-panel rounded-2xl p-3">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-mute">
                {segundo.length} {segundo.length === 1 ? "estado vai" : "estados vão"} ao 2º turno
              </h2>
              <ul className="grid gap-1.5">{segundo.map(linha)}</ul>
            </section>
            {eleitos.length > 0 ? (
              <section className="glass-panel rounded-2xl p-3" aria-label="Eleitos no 1º turno">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-mute">Eleitos no 1º turno</h2>
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {eleitos.map((x) => {
                    const c = x.r1.top[0];
                    if (!c) return null;
                    const cs = cores([c]);
                    return (
                      <li key={x.uf}>
                        <button onClick={() => setSel(x.uf)} className="flex w-full items-center gap-2 rounded-xl border border-line px-2 py-1 text-left text-xs hover:bg-white/5">
                          <Avatar n={c.n} sq={c.sq} nome={c.nome} cor={cs[0]} size={26} />
                          <span className="font-semibold">{x.uf}</span>
                          <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                          <span className="tabular text-mute">{fmtPct(c.pct, 0)}%</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </>
        )}
        <p className="text-[10px] leading-relaxed text-mute">
          Vai ao 2º turno o estado em que o líder do 1º turno não passou de 50% dos votos válidos. Dados oficiais do TSE.
        </p>
      </aside>
    </div>
  );
}
