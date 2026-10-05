"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EXT_CIDADES, WORLD_BORDERS, WORLD_H, WORLD_LAND, WORLD_W } from "@/lib/exterior-mapa";
import type { CidadeRes } from "@/lib/apuracao/exterior";
import type { Area } from "@/lib/apuracao/types";
import { fmtInt, fmtPct } from "./types";
import Bandeira from "./Bandeira";

type Cor = (n: number | undefined) => string;
const POLL = 30_000;

export default function MapaExterior({
  total,
  cor,
  onVoltar,
}: {
  total: Area | undefined;
  cor: Cor;
  onVoltar: () => void;
}) {
  const [cidades, setCidades] = useState<Record<string, CidadeRes>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState({ k: 1, x: 0, y: 0 });
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const r = await fetch("/api/exterior");
        if (r.ok) {
          const j = (await r.json()) as { cidades: Record<string, CidadeRes> };
          if (alive) setCidades(j.cidades ?? {});
        }
      } catch {
        /* tenta de novo */
      }
      if (alive) t = setTimeout(load, POLL);
    };
    void load();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  const maxEl = useMemo(() => Math.max(1, ...Object.values(cidades).map((c) => c.el)), [cidades]);
  const comDados = Object.keys(cidades).length;
  const fechadas = Object.values(cidades).filter((c) => c.pa >= 99.99).length;
  const nomeDe = (cd: string) => EXT_CIDADES.find((c) => c.cd === cd)?.nome ?? cd;
  const isoDe = (cd: string) => EXT_CIDADES.find((c) => c.cd === cd)?.iso;
  const lista = useMemo(
    () => Object.values(cidades).sort((a, b) => b.el - a.el),
    [cidades],
  );
  const ativa = hover ?? sel;
  const det = ativa ? cidades[ativa] : null;

  // Zoom com roda do mouse (sem rolar a página só quando o mouse está no mapa) e arrastar
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // só amplia com Ctrl/⌘ + roda; senão rola a página
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * WORLD_W;
      const py = ((e.clientY - rect.top) / rect.height) * WORLD_H;
      setZoom((z) => {
        const k = Math.min(8, Math.max(1, z.k * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
        const nx = px - ((px - z.x) / z.k) * k;
        const ny = py - ((py - z.y) / z.k) * k;
        return clamp({ k, x: nx, y: ny });
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const vb = `0 0 ${WORLD_W} ${WORLD_H}`;
  return (
    <section className="rounded-2xl border border-line bg-panel p-3 sm:p-5" aria-label="Exterior">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <nav className="text-sm text-mute">
          <button onClick={onVoltar} className="underline">
            Brasil
          </button>{" "}
          › <span className="text-paper">Exterior</span>
        </nav>
        <p className="tabular text-xs text-mute">
          {comDados > 0
            ? `${fechadas} urnas fechadas · ${comDados - fechadas} apurando · ${comDados} cidades`
            : "Aguardando o TSE divulgar o exterior"}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-ink">
        <svg
          ref={svg}
          viewBox={vb}
          className="block w-full touch-pan-y select-none"
          style={{ aspectRatio: `${WORLD_W}/${WORLD_H}`, cursor: zoom.k > 1 ? "grab" : "default" }}
          role="img"
          aria-label="Mapa-múndi com as cidades onde há seções eleitorais"
          onPointerDown={(e) => {
            if (zoom.k > 1) {
              drag.current = { x: e.clientX, y: e.clientY };
              (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
            }
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const r = e.currentTarget.getBoundingClientRect();
            const dx = ((e.clientX - drag.current.x) / r.width) * WORLD_W;
            const dy = ((e.clientY - drag.current.y) / r.height) * WORLD_H;
            drag.current = { x: e.clientX, y: e.clientY };
            setZoom((z) => clamp({ ...z, x: z.x + dx, y: z.y + dy }));
          }}
          onPointerUp={() => (drag.current = null)}
        >
          <g transform={`translate(${zoom.x} ${zoom.y}) scale(${zoom.k})`}>
            <path d={WORLD_LAND} fill="#1b2420" />
            <path d={WORLD_BORDERS} fill="none" stroke="#2e3a35" strokeWidth={0.5 / zoom.k} />
            {EXT_CIDADES.map((c) => {
              const r = cidades[c.cd];
              const lider = r?.top[0];
              const base = r ? 3 + Math.sqrt(r.el / maxEl) * 9 : 2.6;
              const rad = base / Math.sqrt(zoom.k);
              return (
                <g
                  key={c.cd}
                  onPointerEnter={() => setHover(c.cd)}
                  onPointerLeave={() => setHover(null)}
                  onClick={() => setSel((s) => (s === c.cd ? null : c.cd))}
                  style={{ cursor: "pointer" }}
                >
                  <circle cx={c.x} cy={c.y} r={Math.max(rad, 6 / zoom.k)} fill="transparent" />
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={rad}
                    fill={lider ? cor(lider.n) : "#3a4640"}
                    fillOpacity={lider ? 0.85 : 0.6}
                    stroke={ativa === c.cd ? "#f3f1ea" : "#0a0d0c"}
                    strokeWidth={(ativa === c.cd ? 1.6 : 0.6) / zoom.k}
                  />
                </g>
              );
            })}
          </g>
        </svg>
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button className="h-8 w-8 rounded-lg border border-line bg-panel text-lg" aria-label="Aproximar" onClick={() => setZoom((z) => clamp({ ...z, k: Math.min(8, z.k * 1.5), x: z.x - (WORLD_W / 2 - z.x) * 0.5, y: z.y - (WORLD_H / 2 - z.y) * 0.5 }))}>+</button>
          <button className="h-8 w-8 rounded-lg border border-line bg-panel text-lg" aria-label="Afastar" onClick={() => setZoom({ k: 1, x: 0, y: 0 })}>−</button>
        </div>
        {det && ativa ? (
          <div className="pointer-events-none absolute bottom-2 left-2 max-w-[260px] rounded-xl border border-line bg-panel/95 p-3 text-xs">
            <p className="flex items-center gap-2 font-semibold">
              <Bandeira iso={isoDe(ativa)} w={22} />
              {nomeDe(ativa)}
            </p>
            <p className="tabular text-mute">
              {fmtPct(det.pa, 1)}% das seções · {fmtInt(det.el)} eleitores
            </p>
            {det.top.slice(0, 2).map((c) => (
              <p key={c.n} className="tabular mt-1 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: cor(c.n) }} />
                {c.nome} <b className="ml-auto">{fmtPct(c.pct)}%</b>
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-center text-[11px] text-mute">
        Cada bolinha é uma cidade com seção eleitoral · cor = quem lidera · tamanho = eleitores · roda do mouse/botões = zoom
      </p>

      {total ? (
        <p className="tabular mt-3 text-sm text-mute">
          Total no exterior: {fmtInt(total.eleitores)} eleitores · {fmtPct(total.pctApurado, 1)}% das seções apuradas
        </p>
      ) : null}

      {lista.length > 0 ? (
        <ul className="mt-3 max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line text-sm">
          {lista.map((c) => (
            <li key={c.cd}>
              <button
                onClick={() => setSel(c.cd)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left ${sel === c.cd ? "bg-ink" : ""}`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cor(c.top[0]?.n) }} />
                <Bandeira iso={isoDe(c.cd)} w={22} />
                <span className="min-w-0 flex-1 truncate">{nomeDe(c.cd)}</span>
                <span className="tabular text-xs text-mute">{fmtInt(c.el)} el.</span>
                <span className="tabular w-14 text-right text-xs">{c.top[0] ? `${fmtPct(c.top[0].pct, 1)}%` : "—"}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function clamp(z: { k: number; x: number; y: number }) {
  const minX = WORLD_W - WORLD_W * z.k;
  const minY = WORLD_H - WORLD_H * z.k;
  return { k: z.k, x: Math.min(0, Math.max(minX, z.x)), y: Math.min(0, Math.max(minY, z.y)) };
}
