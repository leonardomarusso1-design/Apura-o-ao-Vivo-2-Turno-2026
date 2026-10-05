"use client";

import { useEffect, useRef } from "react";

/**
 * Rede de pontos ligados ("cérebro/conexões") bem discreta ao fundo.
 * Leve: poucos pontos, 30 fps, pausa com a aba escondida e não roda com "reduzir movimento",
 * economia de dados ou aparelhos fracos.
 */
export default function FundoRede() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      nav.connection?.saveData ||
      (nav.hardwareConcurrency ?? 8) <= 2 ||
      (nav.deviceMemory ?? 8) <= 2
    )
      return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    type P = { x: number; y: number; vx: number; vy: number };
    let pts: P[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const setup = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(w < 640 ? 24 : 52, Math.round((w * h) / 32000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
    };
    setup();
    window.addEventListener("resize", setup);

    let raf = 0;
    let last = 0;
    const LINK = w < 640 ? 110 : 150;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || t - last < 33) return;
      last = t;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(91,157,255,${(1 - d / LINK) * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
        const tw = 0.35 + 0.35 * Math.sin(t / 900 + i);
        ctx.fillStyle = `rgba(91,157,255,${tw * 0.75})`;
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, 1.6, 0, 6.283);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setup);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
