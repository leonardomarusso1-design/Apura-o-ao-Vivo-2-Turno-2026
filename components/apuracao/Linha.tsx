import type { Ponto } from "@/lib/apuracao/types";

/** Gráfico "Ao longo da apuração": % dos 2 primeiros conforme as seções vão sendo apuradas. SVG puro (leve). */
export default function Linha({ pontos, cor }: { pontos: Ponto[]; cor: (n: number | undefined) => string }) {
  const W = 300;
  const H = 120;
  const ns = pontos[pontos.length - 1]?.c.slice(0, 2).map((c) => c.n) ?? [];
  const todos = pontos.flatMap((p) => p.c.filter((c) => ns.includes(c.n)).map((c) => c.pct));
  const min = Math.floor(Math.min(...(todos.length ? todos : [40])) / 2) * 2 - 2;
  const max = Math.ceil(Math.max(...(todos.length ? todos : [60])) / 2) * 2 + 2;
  const x = (pct: number) => (pct / 100) * W;
  const y = (v: number) => H - ((v - min) / (max - min || 1)) * H;

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5" aria-label="Ao longo da apuração">
      <h2 className="text-sm font-semibold">Ao longo da apuração</h2>
      {pontos.length < 2 ? (
        <p className="mt-3 text-sm text-mute">A curva aparece conforme as seções forem sendo apuradas.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H + 18}`} className="mt-3 w-full" role="img" aria-label="Evolução do percentual por candidato">
          {[min, (min + max) / 2, max].map((v) => (
            <g key={v}>
              <line x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="#232b28" strokeWidth="1" />
              <text x="2" y={y(v) - 3} fill="#8a9792" fontSize="8">{Math.round(v)}%</text>
            </g>
          ))}
          {ns.map((n) => (
            <polyline
              key={n}
              fill="none"
              stroke={cor(n)}
              strokeWidth="2"
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
          <text x="0" y={H + 14} fill="#8a9792" fontSize="8">0% das seções</text>
          <text x={W} y={H + 14} fill="#8a9792" fontSize="8" textAnchor="end">100%</text>
        </svg>
      )}
    </section>
  );
}
