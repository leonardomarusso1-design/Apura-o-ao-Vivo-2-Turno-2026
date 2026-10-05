import type { Ponto } from "@/lib/apuracao/types";

/** Gráfico "Ao longo da apuração": evolução suave dos votos em SVG puro de alta precisão */
export default function Linha({ pontos, cor }: { pontos: Ponto[]; cor: (n: number | undefined) => string }) {
  const W = 320;
  const H = 130;
  const ns = pontos[pontos.length - 1]?.c.slice(0, 2).map((c) => c.n) ?? [];
  const todos = pontos.flatMap((p) => p.c.filter((c) => ns.includes(c.n)).map((c) => c.pct));
  const min = Math.floor(Math.min(...(todos.length ? todos : [40])) / 2) * 2 - 2;
  const max = Math.ceil(Math.max(...(todos.length ? todos : [60])) / 2) * 2 + 2;
  const x = (pct: number) => (pct / 100) * W;
  const y = (v: number) => H - ((v - min) / (max - min || 1)) * H;

  return (
    <section className="glass-panel rise rounded-2xl p-4 sm:p-5" aria-label="Ao longo da apuração">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-paper">
          Curva da Apuração
        </h2>
        <span className="text-[10px] text-mute uppercase tracking-widest">
          Histórico
        </span>
      </div>

      {pontos.length < 2 ? (
        <div className="py-8 text-center text-xs text-mute rounded-xl bg-white/[0.02]">
          A evolução dos percentuais será traçada a cada atualização das seções.
        </div>
      ) : (
        <div className="mt-3">
          <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full select-none" role="img" aria-label="Evolução do percentual por candidato">
            {[min, (min + max) / 2, max].map((v) => (
              <g key={v}>
                <line x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" strokeWidth="1" />
                <text x="2" y={y(v) - 4} fill="#7e8d9f" fontSize="9" fontWeight="500">{Math.round(v)}%</text>
              </g>
            ))}
            {ns.map((n) => (
              <polyline
                key={n}
                fill="none"
                stroke={cor(n)}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pontos
                  .map((p) => {
                    const c = p.c.find((k) => k.n === n);
                    return c ? `${x(p.pct).toFixed(1)},${y(c.pct).toFixed(1)}` : null;
                  })
                  .filter(Boolean)
                  .join(" ")}
              />
            ))}
            <text x="0" y={H + 16} fill="#7e8d9f" fontSize="9" fontWeight="500">0%</text>
            <text x={W} y={H + 16} fill="#7e8d9f" fontSize="9" fontWeight="500" textAnchor="end">100% apurado</text>
          </svg>
        </div>
      )}
    </section>
  );
}
