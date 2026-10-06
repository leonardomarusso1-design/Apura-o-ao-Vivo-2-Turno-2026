"use client";

import { useEffect, useState } from "react";
import type { PontoReplay } from "@/lib/apuracao/types";
import { fmtPct } from "./types";

function Relogio() {
  const [t, setT] = useState("");
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" }));
    f();
    const id = setInterval(f, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular w-[68px] shrink-0 text-sm font-semibold text-paper">{t || "--:--:--"}</span>;
}

/** Barra inferior: relógio, linha do tempo (replay), pessoas agora e "Ao vivo". */
export default function BarraTempo({
  pontos,
  ri,
  setRi,
  online,
  ativo,
  horaHM,
}: {
  pontos: PontoReplay[];
  ri: number | null;
  setRi: (v: number | null) => void;
  online: number | null;
  ativo: boolean;
  horaHM: (iso: string) => string;
}) {
  const tem = ativo && pontos.length >= 2;
  return (
    <div className="glass-panel mt-2 flex items-center gap-3 rounded-2xl px-4 py-2 text-xs" aria-label="Linha do tempo da apuração">
      <Relogio />
      {tem ? (
        <>
          <span className="hidden w-10 shrink-0 text-right text-mute sm:block">{horaHM(pontos[0].t)}</span>
          <input
            type="range"
            min={0}
            max={pontos.length - 1}
            value={ri ?? pontos.length - 1}
            onChange={(e) => {
              const v = Number(e.target.value);
              setRi(v >= pontos.length - 1 ? null : v);
            }}
            aria-label="Voltar no tempo da apuração"
            className="h-6 min-w-[80px] flex-1 accent-[#00e599]"
          />
          <span className="tabular hidden shrink-0 text-paper md:block">
            {ri === null ? "Agora" : `Às ${horaHM(pontos[ri].t)} · ${fmtPct(pontos[ri].pct, 1)}% das seções`}
          </span>
        </>
      ) : (
        <span className="min-w-0 flex-1 truncate text-mute">
          {ativo ? "A linha do tempo da apuração começa a ser gravada no dia 25." : "Dados oficiais do TSE · atualizado automaticamente"}
        </span>
      )}
      {online ? (
        <span className="tabular hidden shrink-0 items-center gap-1.5 text-mute sm:flex">
          <strong className="text-paper">{new Intl.NumberFormat("pt-BR").format(online)}</strong> pessoas agora
        </span>
      ) : null}
      {ri !== null ? (
        <button onClick={() => setRi(null)} className="h-8 shrink-0 rounded-lg bg-lime px-3 font-semibold text-ink">
          Voltar ao vivo
        </button>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5 text-paper">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          Ao vivo
        </span>
      )}
      <span className="hidden shrink-0 text-[10px] text-mute 2xl:block">
        <a href="/" className="underline">Início</a> · <a href="/privacidade" className="underline">Privacidade</a> · Dados: TSE
      </span>
    </div>
  );
}
