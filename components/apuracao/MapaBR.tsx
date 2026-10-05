"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BR_UFS } from "@/lib/br-map";
import type { Area } from "@/lib/apuracao/types";
import { fmtPct } from "./types";
import Bandeira from "./Bandeira";

type Props = {
  ufs: Record<string, Area>;
  cor: (n: number | undefined) => string;
  selecionada: string | null;
  onSelect: (uf: string) => void;
  tv?: boolean;
  modo?: ModoMapa;
  candN?: number | null;
};

export type ModoMapa = "estados" | "vantagem" | "apurado" | "candidato";

const VB_W = 760; // largura estendida p/ caixinhas dos estados pequenos
const VB_H = 639;
const PEQUENOS_NE = ["RN", "PB", "PE", "AL", "SE"];
const PEQUENOS_SUL = ["ES", "RJ"];

type Pt = { x: number; y: number };

export default function MapaBR({ ufs, cor, selecionada, onSelect, tv = false, modo = "estados", candN = null }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ uf: string; x: number; y: number } | null>(null);
  const refs = useRef<Record<string, SVGPathElement | null>>({});
  const [centros, setCentros] = useState<Record<string, Pt>>({});

  // Centro de cada estado medido no próprio navegador (getBBox) — sem tabela manual
  useLayoutEffect(() => {
    const c: Record<string, Pt> = {};
    for (const u of BR_UFS) {
      const el = refs.current[u.id];
      if (el) {
        const b = el.getBBox();
        c[u.id.toUpperCase()] = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      }
    }
    setCentros(c);
  }, []);

  // ---- Zoom/pan: roda do mouse, arrastar, pinça no celular e botões +/- ----
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, w: VB_W, h: VB_H });
  const viewRef = useRef(view);
  viewRef.current = view;
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef({ dist: 0, moved: 0 });
  const zoomado = view.w < VB_W - 0.5;

  const clamp = useCallback((v: { x: number; y: number; w: number; h: number }) => {
    const w = Math.min(VB_W, Math.max(VB_W / 8, v.w));
    const h = (w / VB_W) * VB_H;
    return { w, h, x: Math.min(VB_W - w, Math.max(0, v.x)), y: Math.min(VB_H - h, Math.max(0, v.y)) };
  }, []);

  const toSvg = useCallback((cx: number, cy: number) => {
    const el = svgRef.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return { x: VB_W / 2, y: VB_H / 2 };
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }, []);

  // fator > 1 aproxima; mantém o ponto (px,py) fixo na tela
  const zoomEm = useCallback(
    (fator: number, px: number, py: number) => {
      const v = viewRef.current;
      const w = v.w / fator;
      const nv = clamp({ w, h: 0, x: px - ((px - v.x) / v.w) * w, y: py - ((py - v.y) / v.h) * ((w / VB_W) * VB_H) });
      setView(nv);
    },
    [clamp],
  );

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toSvg(e.clientX, e.clientY);
      zoomEm(e.deltaY < 0 ? 1.2 : 1 / 1.2, p.x, p.y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [toSvg, zoomEm]);

  const onPointerDown = (e: React.PointerEvent) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesto.current.moved = 0;
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      gesto.current.dist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = ptrs.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    ptrs.current.set(e.pointerId, cur);

    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesto.current.dist > 0) {
        const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
        zoomEm(d / gesto.current.dist, mid.x, mid.y);
      }
      gesto.current.dist = d;
      gesto.current.moved = 99;
      return;
    }
    if (ptrs.current.size === 1 && viewRef.current.w < VB_W - 0.5) {
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      gesto.current.moved += Math.abs(dx) + Math.abs(dy);
      const m = svgRef.current?.getScreenCTM();
      const k = m ? 1 / m.a : 1; // px da tela -> unidades do viewBox
      const v = viewRef.current;
      setView(clamp({ ...v, x: v.x - dx * k, y: v.y - dy * k }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId);
    gesto.current.dist = 0;
  };
  const clicou = (uf: string) => {
    if (gesto.current.moved > 6) return; // foi arrasto, não clique
    onSelect(uf);
  };

  const lider = (uf: string) => {
    const a = ufs[uf];
    return a && a.validos > 0 ? a.cands[0] : undefined;
  };

  const caixa = (uf: string, x: number, y: number) => {
    const l = lider(uf);
    const e = estilo(uf);
    const c = centros[uf];
    return (
      <g key={uf} className="cursor-pointer" onClick={() => clicou(uf)} {...hoverProps(uf)}>
        {c ? <line x1={c.x} y1={c.y} x2={x} y2={y + 11} stroke="#3a4642" strokeWidth="0.6" /> : null}
        <rect x={x} y={y} width="74" height="22" rx="4" fill={e.fill} fillOpacity={l ? Math.max(0.55, e.op) : 1} />
        <text x={x + 8} y={y + 15} fontSize="11" fontWeight="700" fill="#0a0d0c">{uf}</text>
        <text x={x + 66} y={y + 15} fontSize="11" fontWeight="700" fill="#0a0d0c" textAnchor="end">
          {e.rot}
        </text>
      </g>
    );
  };

  const ext = lider("ZZ");

  const maxDif = Math.max(
    1,
    ...Object.values(ufs).map((a) => (a.cands.length > 1 ? a.cands[0].votos - a.cands[1].votos : 0)),
  );
  const candDe = (uf: string) => (candN == null ? undefined : ufs[uf]?.cands.find((c) => c.n === candN));
  /** cor, opacidade e rótulo de cada estado conforme o modo do mapa */
  const estilo = (uf: string): { fill: string; op: number; rot: string } => {
    const a = ufs[uf];
    const l = lider(uf);
    if (!a || !l) return { fill: "#222d29", op: 1, rot: "—" };
    if (modo === "vantagem") {
      const d = a.cands.length > 1 ? l.votos - a.cands[1].votos : l.votos;
      const m = d >= 1_000_000 ? `${(d / 1_000_000).toFixed(1).replace(".", ",")}M` : d >= 1000 ? `${Math.round(d / 1000)}k` : String(d);
      return { fill: cor(l.n), op: 0.25 + 0.75 * Math.sqrt(d / maxDif), rot: `+${m}` };
    }
    if (modo === "apurado") {
      return { fill: "#c6f24e", op: 0.1 + 0.8 * (a.pctApurado / 100), rot: `${Math.round(a.pctApurado)}%` };
    }
    if (modo === "candidato") {
      const c = candDe(uf);
      if (!c) return { fill: "#222d29", op: 1, rot: "—" };
      return { fill: cor(c.n), op: Math.min(1, 0.15 + (c.pct / 80) * 0.85), rot: `${Math.round(c.pct)}%` };
    }
    return { fill: cor(l.n), op: Math.min(1, Math.max(0.35, (l.pct - 48) / 22 + 0.35)), rot: `${Math.round(l.pct)}%` };
  };

  /** Tooltip ao passar o mouse (só mouse; no celular o toque abre o painel do estado) */
  const hoverProps = (uf: string) => ({
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") setHover({ uf, x: e.clientX, y: e.clientY });
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") setHover({ uf, x: e.clientX, y: e.clientY });
    },
    onPointerLeave: () => setHover(null),
  });
  const tip = hover ? ufs[hover.uf] : undefined;
  const box = wrap.current?.getBoundingClientRect();
  const nomeUf = (uf: string) => (uf === "ZZ" ? "Exterior" : (BR_UFS.find((u) => u.id.toUpperCase() === uf)?.nome ?? uf));

  const btn =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel/90 text-lg leading-none text-paper backdrop-blur";

  return (
    <div ref={wrap} className={`relative w-full ${tv ? "h-full" : ""}`}>
    <svg
      ref={svgRef}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      className={`mx-auto w-full select-none ${tv ? "h-full max-h-full" : "h-auto max-h-[80vh]"}`}
      style={{ touchAction: zoomado ? "none" : "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
      role="img"
      aria-label="Mapa do Brasil por estado (use a roda do mouse ou pinça para ampliar)"
    >
      {BR_UFS.map((u) => {
        const id = u.id.toUpperCase();
        const l = lider(id);
        const es = estilo(id);
        const sel = selecionada === id;
        return (
          <path
            key={u.id}
            ref={(el) => {
              refs.current[u.id] = el;
            }}
            d={u.path}
            fill={es.fill}
            fillOpacity={es.op}
            {...hoverProps(id)}
            stroke={sel ? "#f3f1ea" : "#0a0d0c"}
            strokeWidth={sel ? 2.2 : 0.9}
            className="cursor-pointer transition-opacity hover:opacity-80"
            onClick={() => clicou(id)}
            tabIndex={0}
            role="button"
            aria-label={`${u.nome}${l ? `: ${l.nome} lidera` : ": sem dados"}`}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(id)}
          />
        );
      })}

      {/* rótulos dentro dos estados grandes */}
      <g className="hidden sm:block" pointerEvents="none">
        {BR_UFS.filter((u) => !PEQUENOS_NE.includes(u.id.toUpperCase()) && !PEQUENOS_SUL.includes(u.id.toUpperCase())).map((u) => {
          const id = u.id.toUpperCase();
          const c = centros[id];
          const l = lider(id);
          if (!c) return null;
          return (
            <g key={id}>
              <text x={c.x} y={c.y - 1} textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" stroke="#0a0d0c" strokeWidth="2.5" paintOrder="stroke">
                {id}
              </text>
              {l ? (
                <text x={c.x} y={c.y + 11} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" stroke="#0a0d0c" strokeWidth="2.5" paintOrder="stroke">
                  {estilo(id).rot}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>

      {/* caixinhas dos estados pequenos + exterior */}
      <g className="hidden sm:block">
        {PEQUENOS_NE.map((uf, i) => caixa(uf, 640, 190 + i * 28))}
        {PEQUENOS_SUL.map((uf, i) => caixa(uf, 640, 400 + i * 28))}
        <g className="cursor-pointer" onClick={() => clicou("ZZ")} {...hoverProps("ZZ")}>
          <rect x="640" y="470" width="74" height="22" rx="4" fill={estilo("ZZ").fill} fillOpacity={ext ? Math.max(0.55, estilo("ZZ").op) : 1} />
          <text x="648" y="485" fontSize="11" fontWeight="700" fill="#0a0d0c">EXT</text>
          <text x="706" y="485" fontSize="11" fontWeight="700" fill="#0a0d0c" textAnchor="end">
            {estilo("ZZ").rot}
          </text>
        </g>
      </g>
    </svg>
    {hover && tip && box ? (
      <div
        className="pointer-events-none absolute z-20 w-56 rounded-xl border border-line bg-panel/95 p-3 text-xs shadow-xl"
        style={{
          left: Math.min(Math.max(hover.x - box.left + 14, 0), Math.max(0, box.width - 230)),
          top: Math.min(Math.max(hover.y - box.top + 14, 0), Math.max(0, box.height - 130)),
        }}
      >
        <p className="flex items-center gap-2 font-semibold">
          <Bandeira uf={hover.uf} w={24} />
          {nomeUf(hover.uf)}
        </p>
        <p className="tabular text-mute">{fmtPct(tip.pctApurado, 1)}% das seções apuradas</p>
        {tip.cands.slice(0, 2).map((c) => (
          <p key={c.sq} className="tabular mt-1.5 flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cor(c.n) }} />
            <span className="truncate">{c.nome}</span>
            <b className="ml-auto">{fmtPct(c.pct, 1)}%</b>
          </p>
        ))}
      </div>
    ) : null}
    <div className="absolute bottom-2 left-2 flex flex-col gap-1.5">
      <button type="button" className={btn} aria-label="Aproximar" onClick={() => zoomEm(1.5, view.x + view.w / 2, view.y + view.h / 2)}>
        +
      </button>
      <button type="button" className={btn} aria-label="Afastar" onClick={() => zoomEm(1 / 1.5, view.x + view.w / 2, view.y + view.h / 2)}>
        −
      </button>
      {zoomado ? (
        <button type="button" className={`${btn} text-xs`} aria-label="Recentralizar" onClick={() => setView({ x: 0, y: 0, w: VB_W, h: VB_H })}>
          1:1
        </button>
      ) : null}
    </div>
    </div>
  );
}
