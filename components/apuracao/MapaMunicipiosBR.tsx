"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ItemMapa } from "@/lib/apuracao/municipios";
import { UFS } from "@/lib/apuracao/types";
import { fmtPct } from "./types";

type Geo = { vb: [number, number, number, number]; m: { i: string; n: string; d: string }[] };
type Resp = { ok: boolean; pendente?: boolean; itens?: ItemMapa[] };
type Info = { uf: string; nm: string; it?: ItemMapa };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const VB = "0 0 1000 1030";

/** Camada de caminhos memorizada: só repinta quando os dados mudam (não a cada movimento do mouse). */
const Camada = memo(function Camada({ uf, geo, itens, cor }: { uf: string; geo: Geo; itens: ItemMapa[] | undefined; cor: (n: number | undefined) => string }) {
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
        const dif = it && it.top[1] ? l!.pct - it.top[1].pct : 20;
        return (
          <path
            key={g.i}
            d={g.d}
            data-i={g.i}
            data-n={g.n}
            fill={l ? cor(l.n) : "#161d29"}
            fillOpacity={l ? Math.min(1, 0.4 + dif / 35) : 0.7}
            stroke="#07090e"
            strokeWidth={0.35}
          />
        );
      })}
    </g>
  );
});

/** Mapa de TODOS os municípios do Brasil (cada um colorido por quem lidera). Carrega estado por estado. */
export default function MapaMunicipiosBR({
  cor,
  onSelectUf,
  onResumo,
}: {
  cor: (n: number | undefined) => string;
  onSelectUf: (uf: string) => void;
  onResumo?: (r: { partido: string; n: number; qt: number }[]) => void;
}) {
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
            const r = await fetch(`/api/municipios-mapa?uf=${l}&c=1`);
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
  }, []);

  // resumo "PL 2.905 · PT 2.665 municípios"
  useEffect(() => {
    const cont = new Map<number, { partido: string; qt: number }>();
    for (const itens of Object.values(dados))
      for (const it of itens) {
        const l = it.top[0];
        if (!l) continue;
        const c = cont.get(l.n) ?? { partido: l.partido, qt: 0 };
        c.qt++;
        cont.set(l.n, c);
      }
    resumoRef.current?.([...cont.entries()].map(([n, v]) => ({ n, ...v })).sort((a, b) => b.qt - a.qt).slice(0, 2));
  }, [dados]);

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
    return { uf, nm, it: m?.get(i) ?? m?.get(i.slice(0, 6)) ?? m?.get(norm(nm)) };
  };

  const carregados = Object.keys(geos).length;
  if (falta && carregados === 0)
    return <p className="p-6 text-center text-sm text-mute">O desenho dos municípios ainda não foi instalado neste site.</p>;

  return (
    <div ref={wrap} className="relative h-full w-full" onPointerLeave={() => setHover(null)}>
      <svg
        viewBox={VB}
        className="mx-auto h-full w-full select-none"
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
          <Camada key={uf} uf={uf} geo={geo} itens={dados[uf]} cor={cor} />
        ))}
      </svg>
      {carregados < UFS.length ? (
        <p className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[11px] text-mute" role="status">
          Carregando municípios… {carregados}/{UFS.length}
        </p>
      ) : null}
      {hover && wrap.current
        ? (() => {
            const b = wrap.current.getBoundingClientRect();
            const { it, nm, uf } = hover.info;
            return (
              <div
                className="pointer-events-none absolute z-30 w-[230px] rounded-xl glass-panel-elevated border border-white/10 p-2.5 text-xs shadow-2xl"
                style={{ left: Math.min(Math.max(hover.x - b.left + 14, 0), Math.max(0, b.width - 240)), top: Math.min(Math.max(hover.y - b.top + 14, 0), Math.max(0, b.height - 120)) }}
              >
                <p className="font-bold text-white">
                  {it?.nm ?? nm} <span className="font-normal text-mute">· {uf}</span>
                </p>
                {it ? (
                  <>
                    {it.top.map((c) => (
                      <p key={c.n} className="mt-1 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cor(c.n) }} />
                          <span className="truncate">{c.nome}</span>
                        </span>
                        <strong className="tabular">{fmtPct(c.pct, 1)}%</strong>
                      </p>
                    ))}
                    <p className="mt-1 text-[11px] text-mute">{fmtPct(it.pa, 0)}% das seções</p>
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
