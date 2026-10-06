"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type T = { k: number; x: number; y: number };

const btn =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#0d1117]/80 text-sm font-semibold text-paper backdrop-blur transition hover:bg-white/10";

/**
 * Zoom + arrastar para qualquer mapa (SVG ou não).
 * Ctrl/⌘ + roda, botões +/−/1:1, pinça e arrastar (quando ampliado). A rolagem normal da página nunca é sequestrada.
 */
export default function ZoomBox({ children, className = "", max = 14 }: { children: ReactNode; className?: string; max?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState<T>({ k: 1, x: 0, y: 0 });
  const tr = useRef(t);
  tr.current = t;
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef({ dist: 0, moved: 0 });

  const fix = useCallback(
    (v: T): T => {
      const el = box.current;
      const k = Math.min(max, Math.max(1, v.k));
      if (!el || k === 1) return { k, x: 0, y: 0 };
      const w = el.clientWidth;
      const h = el.clientHeight;
      return { k, x: Math.min(0, Math.max(w - w * k, v.x)), y: Math.min(0, Math.max(h - h * k, v.y)) };
    },
    [max],
  );

  const zoomEm = useCallback(
    (f: number, cx: number, cy: number) => {
      const v = tr.current;
      const k = Math.min(max, Math.max(1, v.k * f));
      const r = k / v.k;
      setT(fix({ k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r }));
    },
    [fix, max],
  );

  const rel = (cx: number, cy: number) => {
    const b = box.current!.getBoundingClientRect();
    return { x: cx - b.left, y: cy - b.top };
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // rolagem normal rola a página
      e.preventDefault();
      const p = rel(e.clientX, e.clientY);
      zoomEm(e.deltaY < 0 ? 1.25 : 1 / 1.25, p.x, p.y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomEm]);

  const down = (e: React.PointerEvent) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    g.current.moved = 0;
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      g.current.dist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const move = (e: React.PointerEvent) => {
    const prev = ptrs.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    ptrs.current.set(e.pointerId, cur);
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.current.dist > 0) {
        const m = rel((a.x + b.x) / 2, (a.y + b.y) / 2);
        zoomEm(d / g.current.dist, m.x, m.y);
      }
      g.current.dist = d;
      g.current.moved = 99;
      return;
    }
    if (ptrs.current.size === 1 && tr.current.k > 1 && (e.buttons & 1 || e.pointerType !== "mouse")) {
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      g.current.moved += Math.abs(dx) + Math.abs(dy);
      const v = tr.current;
      setT(fix({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  };
  const up = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId);
    g.current.dist = 0;
  };

  const zoomado = t.k > 1.001;
  const centro = () => {
    const el = box.current;
    return { x: (el?.clientWidth ?? 0) / 2, y: (el?.clientHeight ?? 0) / 2 };
  };

  return (
    <div
      ref={box}
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{ touchAction: zoomado ? "none" : "pan-y", cursor: zoomado ? "grab" : undefined }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClickCapture={(e) => {
        if (g.current.moved > 6) {
          e.stopPropagation();
          e.preventDefault();
          g.current.moved = 0;
        }
      }}
    >
      <div className="h-full w-full" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})`, transformOrigin: "0 0" }}>
        {children}
      </div>
      <div className="absolute bottom-2 left-2 z-20 flex flex-col gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" className={btn} aria-label="Aproximar" onClick={() => zoomEm(1.5, centro().x, centro().y)}>
          +
        </button>
        <button type="button" className={btn} aria-label="Afastar" onClick={() => zoomEm(1 / 1.5, centro().x, centro().y)}>
          −
        </button>
        {zoomado ? (
          <button type="button" className={`${btn} font-mono text-[10px]`} aria-label="Recentralizar" onClick={() => setT({ k: 1, x: 0, y: 0 })}>
            1:1
          </button>
        ) : null}
      </div>
    </div>
  );
}
