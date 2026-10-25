"use client";

import { useMemo, useState } from "react";
import type { Ponto } from "@/lib/apuracao/types";
import { fmtInt, fmtPct } from "./types";

type Metrica = "pct" | "votos" | "dif";

const W = 340;
const H = 150;
const PL = 30; // margem esquerda (rótulos do eixo Y)
const PR = 10;
const PT = 8;
const PB = 20; // margem inferior (rótulos do eixo X)
const PW = W - PL - PR;
const PH = H - PT - PB;

const curto = (s: string) => s.split(" ")[0];

/** Gráfico "Curva da apuração": eixo X = % de seções totalizadas; eixo Y = métrica escolhida. Legenda ao vivo no topo. */
export default function Linha({ pontos, cor, nome }: { pontos: Ponto[]; cor: (n: number | undefined) => string; nome?: (n: number) => string }) {
  const [metrica, setMetrica] = useState<Metrica>("pct");
  const [hover, setHover] = useState<number | null>(null);

  const ultimo = pontos[pontos.length - 1];
  const ns = ultimo?.c.slice(0, 2).map((c) => c.n) ?? [];
  const temVotos = pontos.some((p) => p.c.some((c) => typeof c.v === "number"));
  const m: Metrica = !temVotos && metrica !== "pct" ? "pct" : metrica;
  const nm = (n: number) => (nome ? nome(n) : String(n));

  const val = (p: Ponto, n: number): number | null => {
    const c = p.c.find((k) => k.n === n);
    if (!c) return null;
    return m === "votos" ? (c.v ?? null) : c.pct;
  };
  const dif = (p: Ponto): number | null => {
    const [a, b] = ns.map((n) => p.c.find((k) => k.n === n)?.v);
    return typeof a === "number" && typeof b === "number" ? a - b : null; // positivo: o 1º da lista está na frente
  };

  const series = useMemo(
    () =>
      m === "dif"
        ? [{ n: ns[0], pts: pontos.map((p) => ({ x: p.pct, y: dif(p) })) }]
        : ns.map((n) => ({ n, pts: pontos.map((p) => ({ x: p.pct, y: val(p, n) })) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pontos, m],
  );

  const ys = series.flatMap((s) => s.pts.map((p) => p.y).filter((v): v is number => v !== null));
  let min = ys.length ? Math.min(...ys) : 45;
  let max = ys.length ? Math.max(...ys) : 55;
  if (m === "pct") {
    min = Math.min(min, 50);
    max = Math.max(max, 50);
    min = Math.floor((min - 1) / 2) * 2;
    max = Math.ceil((max + 1) / 2) * 2;
    if (max - min < 8) {
      min = 50 - 4;
      max = 50 + 4;
    }
  } else {
    if (m === "dif") {
      min = Math.min(min, 0);
      max = Math.max(max, 0);
    }
    const folga = (max - min || 1) * 0.1;
    min -= folga;
    max += folga;
  }
  const x = (pct: number) => PL + (Math.min(100, Math.max(0, pct)) / 100) * PW;
  const y = (v: number) => PT + PH - ((v - min) / (max - min || 1)) * PH;
  const fmtY = (v: number) => (m === "pct" ? `${Math.round(v)}%` : Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1).replace(".", ",")}mi` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : fmtInt(v));
  const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
  const base = y(m === "dif" ? 0 : min);

  const trocas: { t: string; n: number; pct: number }[] = [];
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1].c[0];
    const b = pontos[i].c[0];
    if (a && b && a.n !== b.n) trocas.push({ t: pontos[i].t, n: b.n, pct: pontos[i].pct });
  }
  const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

  const tabs: [Metrica, string][] = [["pct", "%"], ...(temVotos ? ([["votos", "Votos"], ["dif", "Diferença"]] as [Metrica, string][]) : [])];
  const foco = hover !== null ? pontos[hover] : ultimo;
  const dFoco = foco ? dif(foco) : null;

  const caminho = (pts: { x: number; y: number | null }[]) =>
    pts
      .filter((p): p is { x: number; y: number } => p.y !== null)
      .map((p) => `${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`)
      .join(" ");

  return (
    <section className="glass-panel rise rounded-xl p-3" aria-label="Ao longo da apuração">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-paper">Curva da apuração</h2>
        {pontos.length >= 2 && tabs.length > 1 ? (
          <div className="flex gap-0.5" role="tablist" aria-label="Métrica do gráfico">
            {tabs.map(([k, rot]) => (
              <button
                key={k}
                role="tab"
                aria-selected={m === k}
                onClick={() => setMetrica(k)}
                className={`h-6 rounded-md px-2 text-[10px] font-semibold uppercase tracking-wider ${m === k ? "bg-white/10 text-paper" : "text-mute hover:text-paper"}`}
              >
                {rot}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {foco && ns.length ? (
        <div className="tabular mb-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]" aria-live="off">
          {m === "dif" ? (
            <span className="font-semibold text-paper">{dFoco === null ? "—" : `${nm(dFoco >= 0 ? ns[0] : ns[1])} +${fmtInt(Math.abs(dFoco))}`}</span>
          ) : (
            ns.map((n) => {
              const c = foco.c.find((k) => k.n === n);
              return (
                <span key={n} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: cor(n) }} />
                  <span className="text-mute">{curto(nm(n))}</span>
                  <strong style={{ color: cor(n) }}>{c ? (m === "votos" ? fmtInt(c.v ?? 0) : `${fmtPct(c.pct, 2)}%`) : "—"}</strong>
                </span>
              );
            })
          )}
          <span className="ml-auto text-[10px] text-mute">
            {hora(foco.t)} · {fmtPct(foco.pct, 1)}% apurado
          </span>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none touch-pan-y"
        role="img"
        aria-label={m === "dif" ? "Evolução da diferença de votos" : m === "votos" ? "Evolução dos votos por candidato" : "Evolução do percentual por candidato"}
        onPointerMove={(e) => {
          if (pontos.length < 2) return;
          const r = e.currentTarget.getBoundingClientRect();
          const px = (((e.clientX - r.left) / r.width) * W - PL) / PW * 100;
          let best = 0;
          for (let i = 1; i < pontos.length; i++) if (Math.abs(pontos[i].pct - px) < Math.abs(pontos[best].pct - px)) best = i;
          setHover(best);
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.n} id={`lg-${s.n}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={cor(s.n)} stopOpacity="0.28" />
              <stop offset="100%" stopColor={cor(s.n)} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((v) => (
          <g key={v}>
            <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PL - 4} y={y(v) + 3} fill="#7e8d9f" fontSize="8.5" textAnchor="end">{fmtY(v)}</text>
          </g>
        ))}
        {[0, 25, 50, 75, 100].map((p) => (
          <text key={p} x={x(p)} y={H - 6} fill="#7e8d9f" fontSize="8.5" textAnchor={p === 0 ? "start" : p === 100 ? "end" : "middle"}>{p}%</text>
        ))}

        {m === "pct" ? (
          <g>
            <line x1={PL} x2={W - PR} y1={y(50)} y2={y(50)} stroke="rgba(255,255,255,0.5)" strokeDasharray="4 3" strokeWidth="1" />
            <text x={W - PR} y={y(50) - 3} fill="#cbd5e1" fontSize="8.5" fontWeight="600" textAnchor="end">50%</text>
          </g>
        ) : null}
        {m === "dif" ? <line x1={PL} x2={W - PR} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.35)" strokeWidth="1" /> : null}

        {pontos.length === 0 ? (
          <text x={PL + PW / 2} y={PT + PH / 2 + 24} fill="#7e8d9f" fontSize="10" textAnchor="middle">
            A curva aparece com as primeiras seções
          </text>
        ) : null}

        {m !== "dif"
          ? series.map((s) => {
              const pts = s.pts.filter((p): p is { x: number; y: number } => p.y !== null);
              if (pts.length < 2) return null;
              const d = `M${x(pts[0].x).toFixed(1)},${base.toFixed(1)} ${pts.map((p) => `L${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ")} L${x(pts[pts.length - 1].x).toFixed(1)},${base.toFixed(1)} Z`;
              return <path key={`a${s.n}`} d={d} fill={`url(#lg-${s.n})`} />;
            })
          : null}

        {series.map((s) => (
          <polyline
            key={s.n}
            fill="none"
            stroke={m === "dif" ? "#e5e7eb" : cor(s.n)}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={caminho(s.pts)}
          />
        ))}

        {hover !== null && pontos[hover] ? (
          <line x1={x(pontos[hover].pct)} x2={x(pontos[hover].pct)} y1={PT} y2={PT + PH} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
        ) : null}

        {series.map((s) => {
          const i = hover !== null ? hover : pontos.length - 1;
          const p = s.pts[i];
          if (!p || p.y === null) return null;
          const c = m === "dif" ? "#e5e7eb" : cor(s.n);
          return (
            <g key={`d${s.n}`}>
              {hover === null ? (
                <circle cx={x(p.x)} cy={y(p.y)} r="3" fill={c} opacity="0.6">
                  <animate attributeName="r" values="3;9;3" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                </circle>
              ) : null}
              <circle cx={x(p.x)} cy={y(p.y)} r="3.2" fill={c} stroke="#07090e" strokeWidth="1.2" />
            </g>
          );
        })}
      </svg>

      {pontos.length >= 2 && hover === null ? <p className="text-[10px] text-mute">Passe o dedo ou o mouse no gráfico para ver cada leitura.</p> : null}
      {m === "dif" && ns.length > 1 ? <p className="text-[10px] text-mute">Acima da linha: {curto(nm(ns[0]))} na frente. Abaixo: {curto(nm(ns[1]))} na frente.</p> : null}

      {trocas.length > 0 ? (
        <div className="mt-2 border-t border-white/[0.06] pt-1.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-mute">Mudanças de liderança</p>
          <ul className="grid gap-0.5 text-[11px]">
            {trocas
              .slice(-4)
              .reverse()
              .map((t) => (
                <li key={t.t} className="tabular flex items-center justify-between gap-2">
                  <span style={{ color: cor(t.n) }} className="truncate font-medium">
                    {nm(t.n)} assumiu
                  </span>
                  <span className="shrink-0 text-mute">
                    {hora(t.t)} · {fmtPct(t.pct, 1)}%
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
