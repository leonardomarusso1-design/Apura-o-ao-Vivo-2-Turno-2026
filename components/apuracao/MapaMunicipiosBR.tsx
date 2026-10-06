"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ItemMapa } from "@/lib/apuracao/municipios";
import { UFS } from "@/lib/apuracao/types";
import { fmtInt, fmtPct } from "./types";
import Avatar from "./Avatar";
import ZoomBox from "./ZoomBox";
import { qt, useTurno } from "./TurnoContext";

type Geo = { vb: [number, number, number, number]; m: { i: string; n: string; d: string }[] };
type Resp = { ok: boolean; pendente?: boolean; itens?: ItemMapa[] };
type Info = { uf: string; nm: string; d: string; it?: ItemMapa };

export type ModoMun = "municipios" | "vantagem" | "candidato";
export type ResumoMun = { partido: string; n: number; qt: number; rot?: string };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const VB = "0 0 1000 1030";
const FUNDO = "#121a26";

/** Vantagem em votos do líder sobre o 2º colocado. */
function margem(it: ItemMapa): number {
  const [a, b] = it.top;
  if (!a) return 0;
  if (!b) return a.v ?? 0;
  if (a.v !== undefined && b.v !== undefined) return Math.max(0, a.v - b.v);
  return it.vt ? Math.max(0, ((a.pct - b.pct) / 100) * it.vt) : 0;
}
/** Raio da bolha (área proporcional à vantagem). */
const altura = (m: number, max: number) => 1.1 + 12 * Math.sqrt(Math.min(1, m / Math.max(1, max)));
const fmtVotos = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".", ",")} mi` : n >= 1000 ? `${Math.round(n / 1000)} mil` : String(Math.round(n)));

/** Centro do maior anel do desenho (onde nasce o "espeto"). */
function centro(d: string): [number, number] | null {
  let best: [number, number] | null = null;
  let bestA = -1;
  for (const ring of d.split("M")) {
    if (!ring) continue;
    const nums = ring.match(/-?\d+\.?\d*/g);
    if (!nums || nums.length < 6) continue;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = +nums[i], y = +nums[i + 1];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const a = (x1 - x0) * (y1 - y0);
    if (a > bestA) {
      bestA = a;
      best = [(x0 + x1) / 2, (y0 + y1) / 2];
    }
  }
  return best;
}

type Cor = (n: number | undefined) => string;

/** Camada de caminhos memorizada: só repinta quando os dados/modo mudam (não a cada movimento do mouse). */
const Camada = memo(function Camada({
  uf,
  geo,
  itens,
  cor,
  modo,
  candN,
  lo,
  hi,
}: {
  uf: string;
  geo: Geo;
  itens: ItemMapa[] | undefined;
  cor: Cor;
  modo: ModoMun;
  candN: number | null;
  lo: number;
  hi: number;
}) {
  const { porId, porNome } = useMemo(() => {
    const id = new Map<string, ItemMapa>();
    const nm = new Map<string, ItemMapa>();
    for (const it of itens ?? []) {
      if (it.cdi) id.set(it.cdi, it);
      nm.set(norm(it.nm), it);
    }
    return { porId: id, porNome: nm };
  }, [itens]);
  return (
    <g data-uf={uf}>
      {geo.m.map((g) => {
        const it = porId.get(g.i) ?? porId.get(g.i.slice(0, 6)) ?? porNome.get(norm(g.n));
        const l = it?.top[0];
        let fill = "#161d29";
        let op = 0.7;
        if (modo === "vantagem") {
          fill = FUNDO;
          op = 1;
        } else if (modo === "candidato" && candN != null) {
          const c = it?.top.find((x) => x.n === candN);
          if (it) {
            fill = cor(candN);
            op = 0.16 + 0.84 * Math.min(1, Math.max(0, ((c?.pct ?? 0) - lo) / Math.max(1, hi - lo)));
          }
        } else if (l) {
          const dif = it!.top[1] ? l.pct - it!.top[1].pct : 20;
          fill = cor(l.n);
          op = Math.min(1, 0.4 + dif / 35);
        }
        return (
          <path
            key={g.i}
            d={g.d}
            data-i={g.i}
            data-n={g.n}
            fill={fill}
            fillOpacity={op}
            stroke={modo === "vantagem" ? "#2b3a52" : "#07090e"}
            strokeWidth={modo === "vantagem" ? 0.3 : 0.35}
          />
        );
      })}
    </g>
  );
});

/** Bolhas luminosas por município: área = vantagem em votos do líder, cor = quem lidera. */
const Bolhas = memo(function Bolhas({ geo, itens, cor, max }: { geo: Geo; itens: ItemMapa[] | undefined; cor: Cor; max: number }) {
  const lista = useMemo(() => {
    const id = new Map<string, ItemMapa>();
    const nm = new Map<string, ItemMapa>();
    for (const it of itens ?? []) {
      if (it.cdi) id.set(it.cdi, it);
      nm.set(norm(it.nm), it);
    }
    const out: { k: string; x: number; y: number; r: number; n: number }[] = [];
    for (const g of geo.m) {
      const it = id.get(g.i) ?? id.get(g.i.slice(0, 6)) ?? nm.get(norm(g.n));
      const l = it?.top[0];
      if (!it || !l) continue;
      const c = centro(g.d);
      if (!c) continue;
      out.push({ k: g.i, x: c[0], y: c[1], r: altura(margem(it), max), n: l.n });
    }
    return out.sort((a, b) => b.r - a.r); // menores por cima
  }, [geo, itens, max]);
  return (
    <g pointerEvents="none" style={{ mixBlendMode: "screen" }}>
      {lista.map((e) => (
        <circle key={e.k} cx={e.x.toFixed(1)} cy={e.y.toFixed(1)} r={e.r.toFixed(2)} fill={cor(e.n)} fillOpacity={0.42} stroke={cor(e.n)} strokeOpacity={0.95} strokeWidth={0.5} />
      ))}
    </g>
  );
});

/** Mapa de TODOS os municípios do Brasil: líder, vantagem (espetos) ou um candidato. Carrega estado por estado. */
export default function MapaMunicipiosBR({
  cor,
  onSelectUf,
  onResumo,
  modo = "municipios",
  candN = null,
  sqDe,
}: {
  cor: Cor;
  onSelectUf: (uf: string) => void;
  onResumo?: (r: ResumoMun[]) => void;
  modo?: ModoMun;
  candN?: number | null;
  sqDe?: (n: number) => number | undefined;
}) {
  const turnoCtx = useTurno();
  const [geos, setGeos] = useState<Record<string, Geo>>({});
  const [dados, setDados] = useState<Record<string, ItemMapa[]>>({});
  const [falta, setFalta] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number; info: Info } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const resumoRef = useRef(onResumo);
  resumoRef.current = onResumo;

  useEffect(() => {
    let vivo = true;
    const fila = [...UFS];
    const trabalhar = async () => {
      while (vivo && fila.length) {
        const uf = fila.shift()!;
        const l = uf.toLowerCase();
        try {
          const g = await fetch(`/geo/mun/${l}.json`);
          if (!g.ok) throw new Error("sem geo");
          const geo = (await g.json()) as Geo;
          if (vivo) setGeos((x) => ({ ...x, [uf]: geo }));
        } catch {
          if (vivo) setFalta(true);
          return;
        }
        for (let t = 0; t < 8 && vivo; t++) {
          try {
            const r = await fetch(`/api/municipios-mapa?uf=${l}&c=1&${qt(turnoCtx)}`);
            const j = (await r.json()) as Resp;
            if (j.itens) {
              if (vivo) setDados((x) => ({ ...x, [uf]: j.itens! }));
              break;
            }
            if (!j.pendente) break;
          } catch {
            break;
          }
          await new Promise((res) => setTimeout(res, 5000));
        }
      }
    };
    void Promise.all([trabalhar(), trabalhar(), trabalhar()]);
    return () => {
      vivo = false;
    };
  }, [turnoCtx]);

  // Estatísticas: líderes, vantagem total por partido, maior vantagem e faixa do candidato
  const est = useMemo(() => {
    const lid = new Map<number, { partido: string; qt: number; mg: number }>();
    let maxM = 0;
    let mn = 100;
    let mx = 0;
    let lidera = 0;
    for (const itens of Object.values(dados))
      for (const it of itens) {
        const l = it.top[0];
        if (!l) continue;
        const m = margem(it);
        if (m > maxM) maxM = m;
        const c = lid.get(l.n) ?? { partido: l.partido, qt: 0, mg: 0 };
        c.qt++;
        c.mg += m;
        lid.set(l.n, c);
        if (candN != null) {
          const p = it.top.find((x) => x.n === candN)?.pct ?? 0;
          if (p < mn) mn = p;
          if (p > mx) mx = p;
          if (l.n === candN) lidera++;
        }
      }
    const lo = Math.floor(Math.min(mn, mx) / 5) * 5;
    const hi = Math.max(lo + 5, Math.ceil(mx / 5) * 5);
    return { lid, maxM: Math.max(maxM, 20_000), lo, hi, lidera };
  }, [dados, candN]);

  useEffect(() => {
    const arr = [...est.lid.entries()].map(([n, v]) => ({ n, partido: v.partido, qt: v.qt, mg: v.mg }));
    if (modo === "vantagem") {
      resumoRef.current?.(
        arr
          .sort((a, b) => b.mg - a.mg)
          .slice(0, 2)
          .map((v) => ({ n: v.n, partido: v.partido, qt: v.mg, rot: `+${fmtVotos(v.mg)}` })),
      );
    } else if (modo === "candidato" && candN != null) {
      const p = est.lid.get(candN);
      resumoRef.current?.([{ n: candN, partido: p?.partido ?? "", qt: est.lidera }]);
    } else {
      resumoRef.current?.(arr.sort((a, b) => b.qt - a.qt).slice(0, 2).map((v) => ({ n: v.n, partido: v.partido, qt: v.qt })));
    }
  }, [est, modo, candN]);

  const porUf = useMemo(() => {
    const out: Record<string, Map<string, ItemMapa>> = {};
    for (const [uf, itens] of Object.entries(dados)) {
      const m = new Map<string, ItemMapa>();
      for (const it of itens) {
        if (it.cdi) m.set(it.cdi, it);
        m.set(norm(it.nm), it);
      }
      out[uf] = m;
    }
    return out;
  }, [dados]);

  const info = (t: EventTarget | null): Info | null => {
    const el = t as SVGElement | null;
    const path = el?.closest?.("path[data-i]") as SVGPathElement | null;
    const g = path?.closest("g[data-uf]") as SVGGElement | null;
    if (!path || !g) return null;
    const uf = g.dataset.uf!;
    const i = path.dataset.i!;
    const nm = path.dataset.n ?? "";
    const m = porUf[uf];
    return { uf, nm, d: path.getAttribute("d") ?? "", it: m?.get(i) ?? m?.get(i.slice(0, 6)) ?? m?.get(norm(nm)) };
  };

  const carregados = Object.keys(geos).length;
  if (falta && carregados === 0)
    return <p className="p-6 text-center text-sm text-mute">O desenho dos municípios ainda não foi instalado neste site.</p>;

  const passos = 5;
  const degrau = (est.hi - est.lo) / passos;

  return (
    <div ref={wrap} className="relative h-full w-full" onPointerLeave={() => setHover(null)}>
      <ZoomBox>
        <svg
          viewBox={VB}
          className="h-full w-full select-none"
          role="img"
          aria-label="Mapa de todos os municípios do Brasil"
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse") return;
            const i = info(e.target);
            setHover(i ? { x: e.clientX, y: e.clientY, info: i } : null);
          }}
          onClick={(e) => {
            const i = info(e.target);
            if (i) onSelectUf(i.uf);
          }}
        >
          {Object.entries(geos).map(([uf, geo]) => (
            <Camada key={uf} uf={uf} geo={geo} itens={dados[uf]} cor={cor} modo={modo} candN={candN} lo={est.lo} hi={est.hi} />
          ))}
          {modo === "vantagem"
            ? Object.entries(geos).map(([uf, geo]) => <Bolhas key={`e${uf}`} geo={geo} itens={dados[uf]} cor={cor} max={est.maxM} />)
            : null}
          {hover?.info.d ? (
            <path d={hover.info.d} fill="none" stroke="#ffffff" strokeWidth={1.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          ) : null}
        </svg>
      </ZoomBox>

      {carregados < UFS.length ? (
        <p className="pointer-events-none absolute left-14 top-2 rounded-md bg-black/60 px-2 py-1 text-[11px] text-mute" role="status">
          Carregando municípios… {carregados}/{UFS.length}
        </p>
      ) : null}

      {/* escalas */}
      {modo === "vantagem" ? (
        <div className="pointer-events-none absolute bottom-2 left-14 flex items-end gap-3 rounded-xl border border-white/10 bg-[#0d1117]/80 px-3 py-2 text-[10px] text-mute backdrop-blur">
          <span className="self-center font-semibold uppercase tracking-wider text-paper/80">Bolha = vantagem</span>
          {[10_000, 100_000, 500_000].map((m) => {
            const r = altura(m, est.maxM) * 0.8;
            return (
              <span key={m} className="flex flex-col items-center gap-0.5">
                <svg width={r * 2 + 2} height={r * 2 + 2} aria-hidden>
                  <circle cx={r + 1} cy={r + 1} r={r} fill="#9aa7b8" fillOpacity={0.4} stroke="#cbd5e1" strokeWidth={0.8} />
                </svg>
                {fmtVotos(m)}
              </span>
            );
          })}
        </div>
      ) : null}
      {modo === "candidato" && candN != null ? (
        <div className="pointer-events-none absolute bottom-2 left-14 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d1117]/80 px-3 py-2 text-[10px] text-mute backdrop-blur">
          <span>menos de {Math.round(est.lo + degrau)}%</span>
          <span className="flex overflow-hidden rounded">
            {Array.from({ length: passos }, (_, i) => (
              <span key={i} className="h-2.5 w-6" style={{ background: cor(candN), opacity: 0.2 + 0.8 * (i / (passos - 1)) }} />
            ))}
          </span>
          <span>{Math.round(est.hi - degrau)}% ou mais</span>
        </div>
      ) : null}

      {hover && wrap.current
        ? (() => {
            const b = wrap.current.getBoundingClientRect();
            const { it, nm, uf } = hover.info;
            const linhas = it ? it.top.slice(0, 2) : [];
            const extra = it && candN != null && modo === "candidato" && !linhas.some((c) => c.n === candN) ? it.top.find((c) => c.n === candN) : undefined;
            const m = it ? margem(it) : 0;
            return (
              <div
                className="pointer-events-none absolute z-30 w-[250px] rounded-2xl glass-panel-elevated border border-white/10 p-3 text-xs shadow-2xl"
                style={{ left: Math.min(Math.max(hover.x - b.left + 14, 0), Math.max(0, b.width - 260)), top: Math.min(Math.max(hover.y - b.top + 14, 0), Math.max(0, b.height - 190)) }}
              >
                <p className="border-b border-white/[0.06] pb-2 text-sm font-bold text-white">
                  {it?.nm ?? nm} <span className="font-normal text-mute">· {uf}</span>
                </p>
                {it ? (
                  <>
                    <div className="mt-2 grid gap-2">
                      {[...linhas, ...(extra ? [extra] : [])].map((c) => (
                        <div key={c.n} className="flex items-center gap-2.5">
                          <Avatar n={c.n} sq={c.sq ?? sqDe?.(c.n)} nome={c.nome} cor={cor(c.n)} size={32} />
                          <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate font-semibold text-paper">{c.nome}</span>
                            <span className="text-[11px]" style={{ color: cor(c.n) }}>
                              {c.partido} {c.n}
                              {c.v !== undefined ? <span className="text-mute"> · {fmtInt(c.v)} votos</span> : null}
                            </span>
                          </span>
                          <strong className="tabular text-base text-white">{fmtPct(c.pct, 1)}%</strong>
                        </div>
                      ))}
                    </div>
                    <p className="tabular mt-2 flex justify-between border-t border-white/[0.06] pt-2 text-[11px] text-mute">
                      <span>{fmtPct(it.pa, 0)}% das seções</span>
                      {m > 0 ? <span>Vantagem +{fmtInt(m)}</span> : null}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-[11px] text-mute">Carregando…</p>
                )}
              </div>
            );
          })()
        : null}
    </div>
  );
}
