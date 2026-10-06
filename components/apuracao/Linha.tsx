"use client";

import { useMemo, useState } from "react";
import type { Ponto } from "@/lib/apuracao/types";
import { fmtInt, fmtPct } from "./types";

type Metrica = "pct" | "votos" | "dif";

/** Gráfico "Curva da apuração": o eixo horizontal é o % de seções totalizadas; o vertical, a métrica escolhida. */
export default function Linha({ pontos, cor, nome }: { pontos: Ponto[]; cor: (n: number | undefined) => string; nome?: (n: number) => string }) {
  const W = 320;
  const H = 130;
  const [metrica, setMetrica] = useState<Metrica>("pct");
  const [hover, setHover] = useState<number | null>(null);

  const ns = pontos[pontos.length - 1]?.c.slice(0, 2).map((c) => c.n) ?? [];
  const temVotos = pontos.some((p) => p.c.some((c) => typeof c.v === "number"));
  const m: Metrica = !temVotos && metrica !== "pct" ? "pct" : metrica;

  const val = (p: Ponto, n: number): number | null => {
    const c = p.c.find((k) => k.n === n);
    if (!c) return null;
    return m === "votos" ? (c.v ?? null) : c.pct;
  };
  const dif = (p: Ponto): number | null => {
    const [a, b] = ns.map((n) => p.c.find((k) => k.n === n)?.v);
    return typeof a === "number" && typeof b === "number" ? a - b : null; // positivo: o 1º candidato da lista está na frente
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
  let min = ys.length ? Math.min(...ys) : 40;
  let max = ys.length ? Math.max(...ys) : 60;
  if (m === "pct") {
    min = Math.floor(min / 2) * 2 - 2;
    max = Math.ceil(max / 2) * 2 + 2;
  } else {
    if (m === "dif") {
      min = Math.min(min, 0);
      max = Math.max(max, 0);
    }
    const folga = (max - min || 1) * 0.08;
    min -= folga;
    max += folga;
  }
  const x = (pct: number) => (pct / 100) * W;
  const y = (v: number) => H - ((v - min) / (max - min || 1)) * H;
  const fmtY = (v: number) => (m === "pct" ? `${Math.round(v)}%` : Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1).replace(".", ",")} mi` : fmtInt(v));

  const trocas: { t: string; n: number; pct: number }[] = [];
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1].c[0];
    const b = pontos[i].c[0];
    if (a && b && a.n !== b.n) trocas.push({ t: pontos[i].t, n: b.n, pct: pontos[i].pct });
  }
  const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const nm = (n: number) => (nome ? nome(n) : String(n));

  const tabs: [Metrica, string][] = [["pct", "%"], ...(temVotos ? ([["votos", "Votos"], ["dif", "Diferença"]] as [Metrica, string][]) : [])];
  const hp = hover !== null ? pontos[hover] : null;

  return (
    <section className="glass-panel rise rounded-2xl p-4 sm:p-5" aria-label="Ao longo da apuração">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-paper sm:text-sm">Curva da Apuração</h2>
        {pontos.length >= 2 && tabs.length > 1 ? (
          <div className="flex gap-1" role="tablist" aria-label="Métrica do gráfico">
            {tabs.map(([k, rot]) => (
              <button
                key={k}
                role="tab"
                aria-selected={m === k}
                onClick={() => setMetrica(k)}
                className={`h-7 rounded-md px-2 text-[10px] font-semibold uppercase tracking-wider ${m === k ? "bg-white/10 text-paper" : "text-mute hover:text-paper"}`}
              >
                {rot}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[10px] uppercase tracking-widest text-mute">Histórico</span>
        )}
      </div>

      {pontos.length < 2 ? (
        <div className="rounded-xl bg-white/[0.02] py-8 text-center text-xs text-mute">A evolução dos percentuais será traçada a cada atualização das seções.</div>
      ) : (
        <div className="relative mt-3">
          <svg
            viewBox={`0 0 ${W} ${H + 20}`}
            className="w-full select-none touch-pan-y"
            role="img"
            aria-label={m === "dif" ? "Evolução da diferença de votos" : m === "votos" ? "Evolução dos votos por candidato" : "Evolução do percentual por candidato"}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const px = ((e.clientX - r.left) / r.width) * 100;
              let best = 0;
              for (let i = 1; i < pontos.length; i++) if (Math.abs(pontos[i].pct - px) < Math.abs(pontos[best].pct - px)) best = i;
              setHover(best);
            }}
            onPointerLeave={() => setHover(null)}
          >
            {[min, (min + max) / 2, max].map((v) => (
              <g key={v}>
                <line x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" strokeWidth="1" />
                <text x="2" y={y(v) - 4} fill="#7e8d9f" fontSize="9" fontWeight="500">{fmtY(v)}</text>
              </g>
            ))}
            {m === "dif" ? <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.25)" strokeWidth="1" /> : null}
            {series.map((s) => (
              <polyline
                key={s.n}
                fill="none"
                stroke={m === "dif" ? "#e5e7eb" : cor(s.n)}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={s.pts
                  .filter((p) => p.y !== null)
                  .map((p) => `${x(p.x).toFixed(1)},${y(p.y as number).toFixed(1)}`)
                  .join(" ")}
              />
            ))}
            {hp ? <line x1={x(hp.pct)} x2={x(hp.pct)} y1="0" y2={H} stroke="rgba(255,255,255,0.35)" strokeWidth="1" /> : null}
            <text x="0" y={H + 16} fill="#7e8d9f" fontSize="9" fontWeight="500">0%</text>
            <text x={W} y={H + 16} fill="#7e8d9f" fontSize="9" fontWeight="500" textAnchor="end">100% apurado</text>
          </svg>

          {hp ? (
            <div className="tabular pointer-events-none mt-1 rounded-lg border border-white/10 bg-ink/90 px-2.5 py-1.5 text-[11px]">
              <p className="text-mute">
                {hora(hp.t)} · {fmtPct(hp.pct, 1)}% das seções totalizadas
              </p>
              {hp.c.slice(0, 2).map((c) => (
                <p key={c.n} style={{ color: cor(c.n) }}>
                  {nm(c.n)}: {fmtPct(c.pct)}%{typeof c.v === "number" ? ` · ${fmtInt(c.v)} votos` : ""}
                </p>
              ))}
              {dif(hp) !== null ? <p className="text-paper">Diferença: {fmtInt(Math.abs(dif(hp) as number))} votos</p> : null}
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-mute">Passe o dedo ou o mouse sobre o gráfico para ver cada leitura.</p>
          )}

          {m === "dif" ? (
            <p className="mt-1 text-[10px] text-mute">Acima da linha: {nm(ns[0])} na frente. Abaixo: {nm(ns[1])} na frente.</p>
          ) : null}

          {trocas.length > 0 ? (
            <div className="mt-3 border-t border-white/[0.06] pt-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-mute">Mudanças de liderança</p>
              <ul className="grid gap-0.5 text-xs">
                {trocas
                  .slice(-5)
                  .reverse()
                  .map((t) => (
                    <li key={t.t} className="tabular flex items-center justify-between gap-2">
                      <span style={{ color: cor(t.n) }} className="truncate font-medium">
                        {nm(t.n)} assumiu
                      </span>
                      <span className="shrink-0 text-mute">
                        {hora(t.t)} · {fmtPct(t.pct, 1)}% apurado
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
