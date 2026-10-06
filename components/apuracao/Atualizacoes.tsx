"use client";

import { useEffect, useState } from "react";
import type { Evento } from "@/lib/apuracao/types";
import UfIcone from "./UfIcone";
import Bandeira from "./Bandeira";

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

type Noticia = { t: string; titulo: string; fonte: string; url: string };

const atras = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 1 ? "agora" : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.floor(m / 60)} h` : `há ${Math.floor(m / 1440)} d`;
};

/** Manchetes de política (texto, sem Globo): título + veículo + link para a matéria original. */
function Noticias() {
  const [n, setN] = useState<Noticia[] | null>(null);
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        if (!document.hidden) {
          const r = await fetch("/api/noticias");
          if (r.ok && alive) setN(((await r.json()) as { itens: Noticia[] }).itens);
        }
      } catch {
        /* mantém */
      }
      if (alive) t = setTimeout(load, 180_000);
    };
    void load();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);
  return (
    <>
      <ul className="h-72 space-y-2 overflow-y-auto overscroll-contain pr-1 text-xs xl:h-[25rem]">
        {n === null ? (
          <li className="py-8 text-center text-xs text-mute">Buscando as últimas notícias…</li>
        ) : n.length === 0 ? (
          <li className="py-8 text-center text-xs text-mute">Sem notícias novas no momento.</li>
        ) : (
          n.map((x) => (
            <li key={x.url}>
              <a
                href={x.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="clicavel block rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5"
              >
                <span className="mb-0.5 flex items-center gap-1.5 text-[10px] text-mute">
                  <span className="font-semibold text-paper/80">{x.fonte}</span>·<span className="tabular">{atras(x.t)}</span>
                </span>
                <span className="block text-xs leading-snug text-paper/90">{x.titulo} <span aria-hidden className="text-mute">↗</span></span>
              </a>
            </li>
          ))
        )}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-mute">Manchetes e links dos veículos de imprensa; o conteúdo é de cada veículo.</p>
    </>
  );
}

export default function Atualizacoes({ eventos, cor }: { eventos: Evento[]; cor: (n: number | undefined) => string }) {
  const [aba, setAba] = useState<"tse" | "noticias">("tse");
  return (
    <section className="glass-panel rise rounded-2xl p-4 sm:p-5" aria-label="Últimas atualizações">
      <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-2.5">
        <div className="flex items-center gap-1" role="tablist" aria-label="Atualizações">
          {(
            [
              ["tse", "Tempo real TSE"],
              ["noticias", "Notícias"],
            ] as const
          ).map(([k, nome]) => (
            <button
              key={k}
              role="tab"
              aria-selected={aba === k}
              onClick={() => setAba(k)}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold uppercase tracking-wider transition ${aba === k ? "bg-white/10 text-paper" : "text-mute hover:text-paper"}`}
            >
              {k === "tse" ? (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              ) : null}
              {nome}
            </button>
          ))}
        </div>
        {aba === "tse" ? <span className="tabular text-[10px] font-medium text-mute">{eventos.length} avisos</span> : null}
      </div>

      {aba === "noticias" ? (
        <Noticias />
      ) : (
      <ul className="h-72 xl:h-[25rem] space-y-2 overflow-y-auto overscroll-contain pr-1 text-xs">
        {eventos.length === 0 ? (
          <li className="py-8 text-center text-mute text-xs">
            Aguardando primeiras urnas totalizadas pelo TSE...
          </li>
        ) : (
          eventos.map((e, idx) => (
            <li 
              key={`${e.t}|${e.id}|${idx}`} 
              className="flash-in flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition"
            >
              {e.id === "BR" ? (
                <span className="flex w-9 shrink-0 justify-center">
                  <Bandeira iso="br" w={34} ring={e.candN ? cor(e.candN) : undefined} />
                </span>
              ) : e.id === "ZZ" ? (
                <UfIcone uf={e.id} cor={e.candN ? cor(e.candN) : "#7e8d9f"} size={30} />
              ) : (
                <div className="pt-0.5">
                  <Bandeira uf={e.id} w={26} ring={e.candN ? cor(e.candN) : undefined} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] text-mute mb-0.5">
                  <span className="font-semibold text-paper/80">{e.id === "ZZ" ? "Exterior" : e.id === "BR" ? "Brasil" : e.id}</span>
                  <span>·</span>
                  <span className="tabular">{hora(e.t)}</span>
                </div>
                <p className="text-paper/90 text-xs leading-snug">
                  {e.texto}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
      )}
    </section>
  );
}
