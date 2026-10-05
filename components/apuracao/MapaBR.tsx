"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BR_UFS } from "@/lib/br-map";
import type { Area } from "@/lib/apuracao/types";

type Props = {
  ufs: Record<string, Area>;
  cor: (n: number | undefined) => string;
  selecionada: string | null;
  onSelect: (uf: string) => void;
  tv?: boolean;
};

const VB_W = 760; // largura estendida p/ caixinhas dos estados pequenos
const VB_H = 639;
const PEQUENOS_NE = ["RN", "PB", "PE", "AL", "SE"];
const PEQUENOS_SUL = ["ES", "RJ"];

type Pt = { x: number; y: number };

export default function MapaBR({ ufs, cor, selecionada, onSelect, tv = false }: Props) {
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
    const c = centros[uf];
    return (
      <g key={uf} className="cursor-pointer" onClick={() => clicou(uf)}>
        {c ? <line x1={c.x} y1={c.y} x2={x} y2={y + 11} stroke="#3a4642" strokeWidth="0.6" /> : null}
        <rect x={x} y={y} width="74" height="22" rx="4" fill={l ? cor(l.n) : "#222d29"} fillOpacity={l ? 0.9 : 1} />
        <text x={x + 8} y={y + 15} fontSize="11" fontWeight="700" fill="#0a0d0c">{uf}</text>
        <text x={x + 66} y={y + 15} fontSize="11" fontWeight="700" fill="#0a0d0c" textAnchor="end">
          {l ? `${Math.round(l.pct)}%` : "—"}
        </text>
      </g>
    );
  };

  const ext = lider("ZZ");

  const btn =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel/90 text-lg leading-none text-paper backdrop-blur";

  return (
    <div className={`relative w-full ${tv ? "h-full" : ""}`}>
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
        const forca = l ? Math.min(1, Math.max(0.35, (l.pct - 48) / 22 + 0.35)) : 1;
        const sel = selecionada === id;
        return (
          <path
            key={u.id}
            ref={(el) => {
              refs.current[u.id] = el;
            }}
            d={u.path}
            fill={l ? cor(l.n) : "#222d29"}
            fillOpacity={l ? forca : 1}
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
                  {Math.round(l.pct)}%
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
        <g className="cursor-pointer" onClick={() => clicou("ZZ")}>
          <rect x="640" y="470" width="74" height="22" rx="4" fill={ext ? cor(ext.n) : "#222d29"} fillOpacity="0.9" />
          <text x="648" y="485" fontSize="11" fontWeight="700" fill="#0a0d0c">EXT</text>
          <text x="706" y="485" fontSize="11" fontWeight="700" fill="#0a0d0c" textAnchor="end">
            {ext ? `${Math.round(ext.pct)}%` : "—"}
          </text>
        </g>
      </g>
    </svg>
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
