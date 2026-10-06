import type { Ponto } from "@/lib/apuracao/types";

/** Gráfico "Ao longo da apuração": evolução suave dos votos em SVG puro de alta precisão */
export default function Linha({ pontos, cor, nome }: { pontos: Ponto[]; cor: (n: number | undefined) => string; nome?: (n: number) => string }) {
  const W = 320;
  const H = 130;
  const ns = pontos[pontos.length - 1]?.c.slice(0, 2).map((c) => c.n) ?? [];
  const todos = pontos.flatMap((p) => p.c.filter((c) => ns.includes(c.n)).map((c) => c.pct));
  const min = Math.floor(Math.min(...(todos.length ? todos : [40])) / 2) * 2 - 2;
  const max = Math.ceil(Math.max(...(todos.length ? todos : [60])) / 2) * 2 + 2;
  const x = (pct: number) => (pct / 100) * W;
  const y = (v: number) => H - ((v - min) / (max - min || 1)) * H;

  // Mudanças de liderança: cada vez que o primeiro colocado nacional troca entre uma leitura e a seguinte
  const trocas: { t: string; n: number; pct: number }[] = [];
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1].c[0];
    const b = pontos[i].c[0];
    if (a && b && a.n !== b.n) trocas.push({ t: pontos[i].t, n: b.n, pct: pontos[i].pct });
  }
  const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

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
          {trocas.length > 0 ? (
            <div className="mt-3 border-t border-white/[0.06] pt-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-mute">Mudanças de liderança</p>
              <ul className="grid gap-0.5 text-xs">
                {trocas
                  .slice(-5)
                  .reverse()
                  .map((x) => (
                    <li key={x.t} className="tabular flex items-center justify-between gap-2">
                      <span style={{ color: cor(x.n) }} className="truncate font-medium">
                        {nome ? nome(x.n) : x.n} assumiu
                      </span>
                      <span className="shrink-0 text-mute">
                        {hora(x.t)} · {x.pct.toFixed(1).replace(".", ",")}% apurado
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
