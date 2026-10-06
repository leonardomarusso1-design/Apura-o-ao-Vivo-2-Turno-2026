"use client";

import { useEffect, useState } from "react";
import MapaBR from "./MapaBR";
import Ticker from "./Ticker";
import Legenda from "./Legenda";
import Avatar from "./Avatar";
import Num from "./Num";
import { fmtInt, fmtPct, type Payload } from "./types";

function Hora() {
  const [t, setT] = useState("");
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" }));
    f();
    const id = setInterval(f, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular font-semibold text-paper">{t || "--:--:--"}</span>;
}

/** Modo TV: poucos números, grandes, para telão ou TV ligada a noite toda. O mapa fica ao lado. */
export default function TvView({
  data,
  cor,
  uf,
  onSelect,
  onExit,
}: {
  data: Payload;
  cor: (n: number | undefined) => string;
  uf: string | null;
  onSelect: (uf: string) => void;
  onExit: () => void;
}) {
  const br = data.br;
  const turnoTxt = data.turno === 1 ? "1º turno" : "2º turno";
  const porVotos = [...(br?.cands ?? [])].sort((a, b) => b.votos - a.votos);
  const lider = porVotos[0];
  const dupla = (br?.cands.slice(0, 2) ?? []).sort((a, b) => a.n - b.n); // lados fixos, não trocam quando a liderança muda
  const dif = porVotos.length > 1 ? porVotos[0].votos - porVotos[1].votos : 0;
  const encerrado = Boolean(br && br.pctApurado >= 99.99) || data.status === "finalizado" || data.previa;
  const atualizado = br?.geracao ? `Geração do TSE: ${br.geracao.slice(11)}` : "";

  return (
    <div className="fixed inset-0 z-50 grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] gap-3 bg-ink p-3 sm:p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {encerrado ? (
            <span className="rounded-lg border border-line px-3 py-1 text-sm font-bold uppercase tracking-widest text-mute">Resultado</span>
          ) : (
            <span className="flex items-center gap-2 rounded-lg bg-red-500/15 px-3 py-1 text-sm font-bold uppercase tracking-widest text-red-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              Ao vivo
            </span>
          )}
          <h1 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">Eleições 2026 · {turnoTxt}</h1>
        </div>
        <div className="flex items-center gap-4 text-xl">
          <Hora />
          <button onClick={onExit} className="h-10 shrink-0 rounded-xl border border-line px-4 text-sm text-mute hover:text-paper">
            Sair
          </button>
        </div>
      </header>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col justify-center gap-5 rounded-3xl border border-line bg-panel p-5 sm:p-8" aria-label="Placar">
          <div className="text-center">
            <p className="tabular font-display text-[clamp(3rem,9vw,8rem)] font-bold leading-none">
              {br ? <Num v={br.pctApurado} d={2} /> : "0,00"}
              <span className="ml-1 text-[0.4em] text-mute">%</span>
            </p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.3em] text-mute sm:text-base">das seções totalizadas</p>
            <div className="mx-auto mt-3 h-2 max-w-xl overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-lime transition-all duration-700" style={{ width: `${br?.pctApurado ?? 0}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {dupla.map((c, i) => (
              <div key={c.sq} className={`flex min-w-0 flex-col gap-2 ${i === 1 ? "items-end text-right" : "items-start text-left"}`}>
                <Avatar n={c.n} sq={c.sq} nome={c.nome} cor={cor(c.n)} size={72} eager />
                <p className="w-full truncate text-lg font-semibold uppercase tracking-wide sm:text-2xl" style={{ color: cor(c.n) }}>
                  {c.nome}
                  {lider && c.n === lider.n && c.votos > 0 ? <span className="ml-2 align-middle text-xs text-mute">LÍDER</span> : null}
                </p>
                <p className="tabular font-display text-[clamp(2.5rem,6vw,5.5rem)] font-bold leading-none">
                  <Num v={c.pct} d={2} />
                  <span className="text-[0.4em] text-mute">%</span>
                </p>
                <p className="tabular text-base text-mute sm:text-xl">
                  <Num v={c.votos} d={0} /> votos
                </p>
              </div>
            ))}
          </div>

          {dupla.length === 2 ? (
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-black/40" aria-hidden>
              {dupla.map((c) => (
                <div key={c.sq} className="h-full transition-all duration-700" style={{ width: `${c.pct}%`, background: cor(c.n) }} />
              ))}
            </div>
          ) : null}

          {dif > 0 ? (
            <p className="tabular text-center text-lg sm:text-2xl">
              <span className="text-mute">Diferença </span>
              <strong>{fmtInt(dif)}</strong>
              <span className="text-mute"> votos</span>
            </p>
          ) : null}
        </section>

        <div className="flex min-h-0 flex-col rounded-3xl border border-line bg-panel p-2">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <MapaBR ufs={data.ufs} cor={cor} selecionada={uf} onSelect={onSelect} tv />
          </div>
          <Legenda cands={br?.cands ?? []} />
        </div>
      </div>

      <div className="grid gap-2">
        <Ticker eventos={data.eventos} />
        <p className="text-center text-[11px] text-mute">
          Dados oficiais do TSE. {atualizado ? `${atualizado}. ` : ""}
          {br ? `${fmtPct(br.pctApurado, 2)}% das seções totalizadas. ` : ""}Site independente, sem vínculo com o TSE.
        </p>
      </div>
    </div>
  );
}
