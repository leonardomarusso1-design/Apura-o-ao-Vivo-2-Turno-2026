"use client";

import { useEffect, useMemo, useState } from "react";
import { COR_BLOCO, type Bloco } from "@/lib/apuracao/blocos";
import type { CargoLeg, LegData } from "@/lib/apuracao/legislativo";
import Bandeira from "./Bandeira";
import Avatar from "./Avatar";
import MunicipioBusca from "./MunicipioBusca";
import MapaMunicipios from "./MapaMunicipios";
import MapaBR from "./MapaBR";
import { mkArea } from "./mapaAreas";
import { fmtInt } from "./types";

const ROTULO: Record<Bloco, string> = { esquerda: "Esquerda", centro: "Centrão", direita: "Direita", outros: "Outros" };
const ORDEM: Bloco[] = ["esquerda", "centro", "outros", "direita"];
const TITULO: Record<CargoLeg, string> = { 5: "Senado", 6: "Câmara dos Deputados", 7: "Assembleias Legislativas" };

/** Hemiciclo em SVG: fileiras concêntricas, pontos ordenados por ângulo (esquerda → direita). */
function Hemiciclo({ seats }: { seats: { cor: string; titulo: string }[] }) {
  const total = seats.length;
  const pontos = useMemo(() => {
    const filas = Math.max(2, Math.round(Math.sqrt(total / 3.2)));
    const r0 = 0.38;
    const raios = Array.from({ length: filas }, (_, i) => r0 + ((1 - r0) * i) / (filas - 1));
    const soma = raios.reduce((a, b) => a + b, 0);
    const out: { x: number; y: number; a: number }[] = [];
    raios.forEach((r, i) => {
      const n = i === filas - 1 ? total - out.length : Math.round((total * r) / soma);
      for (let k = 0; k < n; k++) {
        const a = Math.PI - (Math.PI * (k + 0.5)) / n;
        out.push({ x: 50 + 48 * r * Math.cos(a), y: 50 - 48 * r * Math.sin(a), a });
      }
    });
    return out.sort((p, q) => q.a - p.a).slice(0, total);
  }, [total]);
  const raio = Math.max(0.7, Math.min(2.2, 70 / Math.sqrt(total * 6)));
  return (
    <svg viewBox="0 0 100 54" className="w-full" role="img" aria-label={`Hemiciclo com ${total} cadeiras`}>
      {pontos.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y + 3} r={raio} fill={seats[i]?.cor ?? "#333"}>
          <title>{seats[i]?.titulo}</title>
        </circle>
      ))}
    </svg>
  );
}

export default function Legislativo({ cargo }: { cargo: CargoLeg }) {
  const [d, setD] = useState<LegData | null>(null);
  const [erro, setErro] = useState(false);
  const [uf, setUf] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setD(null);
    setErro(false);
    const carregar = async (tentativa: number) => {
      try {
        const r = await fetch(`/api/legislativo?c=${cargo}`);
        const j = (await r.json()) as { ok: boolean; data: LegData | null };
        if (!vivo) return;
        if (j.ok && j.data) setD(j.data);
        else if (tentativa < 6) setTimeout(() => void carregar(tentativa + 1), 8000);
        else setErro(true);
      } catch {
        if (vivo) setErro(true);
      }
    };
    void carregar(0);
    return () => {
      vivo = false;
    };
  }, [cargo]);

  const seats = useMemo(() => {
    if (!d) return [];
    const porBloco: Record<Bloco, { cor: string; titulo: string }[]> = { esquerda: [], centro: [], direita: [], outros: [] };
    for (const p of d.partidos) for (let i = 0; i < p.cadeiras; i++) porBloco[p.bloco].push({ cor: COR_BLOCO[p.bloco][0], titulo: `${p.sg} (${ROTULO[p.bloco]})` });
    return ORDEM.flatMap((b) => porBloco[b]);
  }, [d]);

  const ordemBloco: Bloco[] = ["esquerda", "centro", "direita", "outros"];
  const areas = useMemo(() => {
    const out: Record<string, ReturnType<typeof mkArea>> = {};
    if (!d) return out;
    for (const [id, v] of Object.entries(d.porUf)) {
      const tot = Object.values(v.blocos).reduce((a, b) => a + b, 0) || 1;
      const cands = ordemBloco
        .map((b, i) => ({ b, i, qt: v.blocos[b] }))
        .filter((x) => x.qt > 0)
        .sort((a, b) => b.qt - a.qt || a.i - b.i)
        .map((x) => ({
          sq: x.i + 1,
          n: x.i + 1,
          nome: ROTULO[x.b],
          partido: `${x.qt} de ${tot}`,
          votos: x.qt,
          pct: (x.qt / tot) * 100,
          eleito: true,
        }));
      out[id] = mkArea(id, cands);
    }
    return out;
  }, [d]);
  const corBloco = (n: number | undefined) => (n === undefined ? "#2a332f" : COR_BLOCO[ordemBloco[n - 1] ?? "outros"][0]);

  if (erro) return <p className="rounded-2xl border border-line bg-panel p-6 text-sm text-mute">Não foi possível carregar agora. Tente novamente em instantes.</p>;
  if (!d)
    return (
      <p className="rounded-2xl border border-line bg-panel p-6 text-sm text-mute" role="status">
        Carregando {TITULO[cargo]}… (na primeira vez pode levar alguns segundos)
      </p>
    );

  const ufsOrd = Object.entries(d.porUf).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="grid gap-4">
      <section className="glass-panel rounded-2xl p-4 sm:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-paper sm:text-sm">{TITULO[cargo]}</h2>
        <p className="tabular mt-1 text-xs text-mute">
          {d.definidas} de {d.vagas} vagas definidas
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ORDEM.filter((b) => d.blocos[b] > 0).map((b) => (
            <div key={b} className="rounded-xl border border-line p-3" style={{ borderColor: `${COR_BLOCO[b][0]}66` }}>
              <p className="text-[11px] uppercase tracking-wide text-mute">{ROTULO[b]}</p>
              <p className="tabular font-display text-2xl" style={{ color: COR_BLOCO[b][0] }}>
                {d.blocos[b]}
              </p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-4 max-w-2xl">
          <Hemiciclo seats={seats} />
        </div>
        <p className="mt-1 text-[11px] text-mute">Classificação em blocos é uma simplificação convencional, só para colorir.</p>
      </section>

      <section className="glass-panel rounded-2xl p-3 sm:p-5" aria-label="Mapa">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-paper sm:text-sm">
          {cargo === 5 ? "Senadores eleitos por estado" : "Bloco que mais elegeu em cada estado"}
        </h3>
        <MapaBR ufs={areas} cor={corBloco} selecionada={uf} onSelect={(x) => setUf(x === uf ? null : x)} />
        <ul className="mt-2 flex flex-wrap gap-3 text-xs text-mute">
          {ORDEM.filter((b) => d.blocos[b] > 0).map((b) => (
            <li key={b} className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: COR_BLOCO[b][0] }} />
              {ROTULO[b]}
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-panel rounded-2xl p-4 sm:p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-paper sm:text-sm">Cadeiras por partido</h3>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {d.partidos.map((p) => (
            <li key={p.sg} className="flex items-center justify-between gap-2 border-b border-line/50 py-1">
              <span className="flex items-center gap-2">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: COR_BLOCO[p.bloco][0] }} />
                {p.sg}
              </span>
              <span className="tabular font-semibold">{p.cadeiras}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-panel rounded-2xl p-4 sm:p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-paper sm:text-sm">
          {cargo === 5 ? "Eleitos por estado" : "Resultado por estado"}
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ufsOrd.map(([id, v]) => (
            <button
              key={id}
              onClick={() => setUf(uf === id ? null : id)}
              className="rounded-xl border border-line p-3 text-left transition hover:bg-white/5"
              aria-expanded={uf === id}
            >
              <span className="flex items-center justify-between text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Bandeira uf={id} w={22} />
                  {id}
                </span>
                <span className="tabular text-xs text-mute">
                  {v.definidas}/{v.vagas}
                </span>
              </span>
              <span className="mt-2 flex flex-wrap gap-2">
                {v.top.map((e) => (
                  <span key={e.sq || e.n + e.nome} className="flex items-center gap-1.5" title={`${e.nome} · ${fmtInt(e.votos)} votos`}>
                    <Avatar n={e.n} sq={e.sq} nome={e.nome} cor={COR_BLOCO[bl(e.partido)][0]} size={30} />
                    <span className="text-[11px] leading-tight">
                      <span className="block max-w-[110px] truncate font-medium">{e.nome}</span>
                      <span className="font-semibold" style={{ color: COR_BLOCO[bl(e.partido)][0] }}>
                        {e.partido}
                      </span>
                    </span>
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
        {uf && cargo === 5 ? (
          <div className="mt-4 rounded-xl border border-line bg-black/20 p-4" aria-label={`Senado em ${uf}`}>
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Bandeira uf={uf} w={26} /> {uf} · {d.porUf[uf]?.definidas ?? 0} de {d.porUf[uf]?.vagas ?? 0} vagas
            </h4>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {d.eleitos
                .filter((e) => e.uf === uf)
                .map((e) => (
                  <li key={e.sq || e.n} className="flex items-center gap-3">
                    <Avatar n={e.n} sq={e.sq} nome={e.nome} cor={COR_BLOCO[bl(e.partido)][0]} size={52} />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-semibold">{e.nome}</span>
                      <span className="text-xs" style={{ color: COR_BLOCO[bl(e.partido)][0] }}>
                        {e.partido} · {e.st}
                      </span>
                      <span className="tabular block text-xs text-mute">
                        {fmtInt(e.votos)} votos · {e.pct.toFixed(1).replace(".", ",")}%
                      </span>
                    </span>
                  </li>
                ))}
            </ul>
            <MapaMunicipios uf={uf} cargo={5} />
            <MunicipioBusca uf={uf} cargo={5} cor={(n) => COR_BLOCO[bl(d.eleitos.find((e) => e.n === n)?.partido ?? "")][0]} />
          </div>
        ) : null}
      </section>

      <section className="glass-panel rounded-2xl p-4 sm:p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-paper sm:text-sm">
          {cargo === 5 ? "Senadores eleitos" : "Mais votados do Brasil"}
        </h3>
        <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {(uf ? d.eleitos.filter((e) => e.uf === uf) : d.eleitos).map((e, i) => (
            <li key={e.uf + e.n + e.nome} className="flex items-center gap-2 border-b border-line/50 py-1.5">
              <span className="tabular w-6 text-xs text-mute">{i + 1}</span>
              <Avatar n={e.n} sq={e.sq} nome={e.nome} cor={COR_BLOCO[bl(e.partido)][0]} size={28} />
              <span className="min-w-0 flex-1 truncate">
                {e.nome} <span className="text-[11px] text-mute">· {e.uf}</span>
              </span>
              <span className="text-[11px] font-semibold" style={{ color: COR_BLOCO[bl(e.partido)][0] }}>
                {e.partido}
              </span>
              <span className="tabular text-xs text-mute">{fmtInt(e.votos)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

import { blocoDe } from "@/lib/apuracao/blocos";
const bl = blocoDe;
