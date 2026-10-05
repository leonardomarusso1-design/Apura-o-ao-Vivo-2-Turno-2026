"use client";

import MapaBR from "./MapaBR";
import Placar from "./Placar";
import Linha from "./Linha";
import Ticker from "./Ticker";
import Legenda from "./Legenda";
import Credito from "../Credito";
import { fmtPct, type Payload } from "./types";

/** Modo TV / tela cheia (para live e telões): placar à esquerda, mapa grande, faixa de últimas no rodapé. */
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
  return (
    <div className="fixed inset-0 z-50 grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] gap-3 bg-ink p-3 sm:p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="font-display text-2xl sm:text-3xl">Apuração do {data.turno === 1 ? "1º" : "2º"} turno</h1>
          <span className="tabular hidden text-sm text-mute sm:inline">
            {data.br ? `${fmtPct(data.br.pctApurado, 2)}% das seções` : ""}
          </span>
          <span className="hidden md:inline">
            <Credito compact />
          </span>
        </div>
        <button onClick={onExit} className="h-10 shrink-0 rounded-xl border border-line px-4 text-sm">
          Sair da tela cheia
        </button>
      </header>

      <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(300px,27%)_minmax(0,1fr)]">
        <div className="hidden min-h-0 content-start gap-3 overflow-y-auto lg:grid">
          <Placar br={data.br} cor={cor} />
          <Linha pontos={data.historico} cor={cor} />
        </div>
        <div className="flex min-h-0 flex-col rounded-2xl border border-line bg-panel p-2">
          <div className="lg:hidden">
            <Placar br={data.br} cor={cor} />
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <MapaBR ufs={data.ufs} cor={cor} selecionada={uf} onSelect={onSelect} tv />
          </div>
          <Legenda cands={data.br?.cands ?? []} />
        </div>
      </div>

      <Ticker eventos={data.eventos} />
    </div>
  );
}
