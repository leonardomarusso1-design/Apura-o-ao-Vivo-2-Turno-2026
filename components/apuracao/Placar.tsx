"use client";

import { useState } from "react";
import type { Area } from "@/lib/apuracao/types";
import { fmtInt, fmtPct } from "./types";
import Avatar from "./Avatar";
import Num from "./Num";
import Comparativo2022 from "./Comparativo2022";

export default function Placar({
  br,
  cor,
  turno = 2,
  onCand,
  candSel = null,
}: {
  br: Area | null;
  cor: (n: number | undefined) => string;
  turno?: 1 | 2;
  onCand?: (n: number) => void;
  candSel?: number | null;
}) {
  // Ordena por votos para saber o líder
  const candsPorVotos = [...(br?.cands ?? [])].sort((a, b) => b.votos - a.votos);
  const lider = candsPorVotos[0];
  const segundo = candsPorVotos[1];

  // Posição estável para não trocar de lado bruscamente se houver empate técnico
  const top = (br?.cands.slice(0, 2) ?? []).sort((a, b) => a.n - b.n);
  const resto = br ? br.cands.slice(2) : [];
  const [todos, setTodos] = useState(false);

  const dif = lider && segundo ? Math.abs(lider.votos - segundo.votos) : 0;
  const difPct = lider && segundo ? Math.abs(lider.pct - segundo.pct) : 0;

  return (
    <section 
      className="glass-panel rise rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300"
      aria-label="Placar nacional"
    >
      {/* Indicador de Status / Liderança sutil no topo do card */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-mute flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Presidência da República
        </span>
        {br?.definidoTse ? (
          <span className="rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            Matematicamente Eleito
          </span>
        ) : br?.pctApurado ? (
          <span className="text-[11px] font-medium text-mute tabular">
            Total apurado: <strong className="text-paper font-semibold">{fmtPct(br.pctApurado, 1)}%</strong>
          </span>
        ) : null}
      </div>

      {/* 1º turno encerrado: manchete + data do 2º turno (como no resultado oficial) */}
      {turno === 1 && lider && segundo && br && br.pctApurado >= 99.99 ? (
        <div className="mb-4">
          <p className="text-xl font-semibold leading-snug sm:text-2xl">
            <span style={{ color: cor(top[0]?.n) }}>{top[0]?.nome}</span> e{" "}
            <span style={{ color: cor(top[1]?.n) }}>{top[1]?.nome}</span> vão ao 2º turno
          </p>
          <p className="mt-1 text-xs text-mute">2º turno · Em 25 de outubro</p>
        </div>
      ) : null}

      {/* Duelo de Candidatos */}
      <div className="grid grid-cols-2 gap-3">
        {(top.length ? top : [null, null]).map((c, i) => {
          const isLider = Boolean(c && lider && c.n === lider.n && c.votos > 0);
          const candidatoCor = c ? cor(c.n) : "#7e8d9f";

          return (
            <div
              key={c?.sq ?? i}
              role={c ? "button" : undefined}
              tabIndex={c ? 0 : undefined}
              onClick={() => c && onCand?.(c.n)}
              onKeyDown={(e) => c && (e.key === "Enter" || e.key === " ") && onCand?.(c.n)}
              aria-label={c ? `Ver o mapa de ${c.nome}` : undefined}
              title={c ? "Ver o mapa deste candidato" : undefined}
              style={c && (candSel === c.n) ? { borderColor: candidatoCor } : undefined}
              className={`-m-1 flex min-w-0 cursor-pointer flex-col rounded-2xl border border-transparent p-2 transition hover:border-white/25 hover:bg-white/[0.05] focus-visible:border-white/40 ${candSel === c?.n ? "bg-white/[0.06]" : ""} ${i === 1 ? "items-end text-right" : "items-start text-left"}`}
            >
              <div className={`flex w-full min-w-0 flex-col gap-1.5 ${i === 1 ? "items-end" : "items-start"}`}>
                {c ? (
<Avatar n={c.n} sq={c.sq} nome={c.nome} cor={candidatoCor} size={46} />
                ) : (
                  <div className="w-[46px] h-[46px] rounded-full bg-white/[0.05] animate-pulse" />
                )}
                <div className="w-full min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight text-paper sm:text-[15px]">
                    {c ? c.nome : "—"}
                  </span>
                  <span className={`mt-0.5 flex flex-wrap content-start items-center gap-1.5 text-xs font-medium text-mute ${i === 1 ? "justify-end" : ""}`}>
                    {c ? `${c.partido} · ${c.n}` : ""}
                    {isLider && (
                      <span
                        className="rounded px-1.5 text-[9px] font-bold uppercase leading-4"
                        style={{ backgroundColor: `${candidatoCor}25`, color: candidatoCor }}
                      >
                        Líder
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Porcentagem Grande de Alta Legibilidade */}
              <div className="tabular mt-3.5 flex items-baseline gap-1 font-bold text-3xl sm:text-4xl lg:text-3xl xl:text-4xl text-white tracking-tight">
                {c ? <Num v={c.pct} /> : "––"}
                <span className="text-base sm:text-lg font-medium text-mute">%</span>
              </div>

              {/* Votos absolutos formatados */}
              <div className="tabular mt-1 text-xs text-mute font-medium">
                {c ? `${fmtInt(c.votos)} votos` : ""}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de Progresso Bicolor de Alto Contraste */}
      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-black/40 border border-white/[0.06] p-[1px]" aria-hidden>
        {top.map((c) => (
          <div 
            key={c.sq} 
            className="bar-grow h-full rounded-full transition-all duration-700 first:mr-[1px]" 
            style={{ 
              width: `${c.pct}%`, 
              backgroundColor: cor(c.n),
              boxShadow: `0 0 10px ${cor(c.n)}60`
            }} 
          />
        ))}
      </div>

      {/* Margem de Diferença */}
      {br && top.length === 2 && dif > 0 ? (
        <div className="mt-3.5 flex items-center justify-between text-xs bg-white/[0.03] border border-white/[0.05] rounded-xl px-3 py-2">
          <span className="text-mute">Diferença</span>
          <span className="tabular font-medium text-paper">
            <strong className="text-white font-semibold">{fmtPct(difPct)} pts</strong>
            <span className="text-mute ml-1">({fmtInt(dif)} votos)</span>
          </span>
        </div>
      ) : null}

      {/* Demais Candidatos (se houver mais de 2, como na prévia do 1º turno) */}
      {resto.length > 0 ? (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <ul className="grid gap-1.5 text-xs text-mute">
            {(todos ? resto : resto.slice(0, 2)).map((c) => (
              <li key={c.sq} className="tabular flex items-center justify-between py-0.5">
                <span className="truncate max-w-[180px] text-mute hover:text-paper transition">
                  {c.nome} ({c.partido})
                </span>
                <span className="font-medium text-paper">{fmtPct(c.pct)}%</span>
              </li>
            ))}
          </ul>
          {resto.length > 2 && (
            <button 
              onClick={() => setTodos((t) => !t)} 
              className="mt-2 text-[11px] font-medium text-primary hover:underline transition"
            >
              {todos ? "Recolher candidatos" : `Ver outros ${resto.length} candidatos`}
            </button>
          )}
        </div>
      ) : null}
      {br ? <Comparativo2022 area={br} turno={turno} cor={cor} rotulo="Brasil" /> : null}
    </section>
  );
}
