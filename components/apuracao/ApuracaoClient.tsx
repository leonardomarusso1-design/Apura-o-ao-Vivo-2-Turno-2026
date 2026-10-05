"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapaBR, { type ModoMapa } from "./MapaBR";
import Placar from "./Placar";
import Projecao from "./Projecao";
import Regioes from "./Regioes";
import Atualizacoes from "./Atualizacoes";
import PainelUF from "./PainelUF";
import SponsorSlot from "./SponsorSlot";
import LiveBox from "./LiveBox";
import dynamic from "next/dynamic";
import AdSlot from "../ads/AdSlot";
import ToqyCard from "./ToqyCard";
import { fmtPct, makeCor, type Payload } from "./types";
import Legenda from "./Legenda";
import Linha from "./Linha";

import Credito from "../Credito";
import { SITE_URL, ELECTION_ISO } from "@/lib/env";
import { marcarInscrito } from "@/lib/inscrito";

const POLL_MS = 15_000;
const STALE_MIN = 4; // minutos sem mudança => mensagem de espera
const LS_REF = "apuracao:ref";

// Partes pesadas só são baixadas quando usadas (o mapa-múndi tem ~100 KB)
const MapaExterior = dynamic(() => import("./MapaExterior"), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-2xl border border-line bg-panel" />,
});
const TvView = dynamic(() => import("./TvView"), { ssr: false });

export default function ApuracaoClient({ initial = null }: { initial?: Payload | null }) {
  const [data, setData] = useState<Payload | null>(initial);
  const [erro, setErro] = useState(false);
  const [uf, setUf] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [tv, setTv] = useState(false);
  const [modo, setModo] = useState<ModoMapa>("estados");
  const [candN, setCandN] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);
  const lastChange = useRef<{ key: string; at: number }>({ key: "", at: Date.now() });
  const [, force] = useState(0);

  // Polling leve: pausa com a aba escondida e volta ao reabrir
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const r = await fetch("/api/apuracao");
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as Payload;
        if (!alive) return;
        const key = `${j.br?.secoesApuradas ?? 0}:${j.br?.validos ?? 0}`;
        if (key !== lastChange.current.key) lastChange.current = { key, at: Date.now() };
        setData(j);
        setErro(false);
      } catch {
        if (alive) setErro(true);
      }
      if (alive) timer = setTimeout(load, POLL_MS);
    };
    const onVis = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        void load();
      }
    };
    void load();
    document.addEventListener("visibilitychange", onVis);
    const tick = setInterval(() => force((x) => x + 1), 30_000);
    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    try {
      const saved = localStorage.getItem(LS_REF);
      setRefCode(saved && saved !== "-" ? saved : null);
      setNovo(q.get("novo") === "1" || Boolean(saved));
      if (saved) marcarInscrito();
    } catch {
      setNovo(q.get("novo") === "1");
    }
  }, []);

  // Tela cheia estável: o elemento raiz nunca é remontado e a tela é mantida acordada
  useEffect(() => {
    // Saiu da tela cheia pelo ESC/gesto => sai do modo TV. Não recarrega nada: só troca a visualização.
    const onFs = () => {
      if (!document.fullscreenElement) setTv(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  useEffect(() => {
    if (!tv) return;
    let lock: WakeLockSentinel | null = null;
    const get = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        /* sem suporte */
      }
    };
    void get();
    const re = () => document.visibilityState === "visible" && void get();
    document.addEventListener("visibilitychange", re);
    return () => {
      document.removeEventListener("visibilitychange", re);
      void lock?.release();
    };
  }, [tv]);
  const entrarTv = useCallback(async () => {
    setTv(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* iOS Safari: sem API de tela cheia — o modo TV (overlay) continua funcionando */
    }
  }, []);
  const sairTv = useCallback(async () => {
    setTv(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  const cor = useMemo(() => makeCor(data?.br?.cands.map((c) => ({ n: c.n, partido: c.partido })) ?? []), [data]);

  const compartilhar = async () => {
    const url = `${SITE_URL}/apuracao`;
    try {
      if (navigator.share) await navigator.share({ title: "Apuração ao vivo", text: share, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }
    } catch {
      /* cancelado */
    }
  };

  const parado = Date.now() - lastChange.current.at > STALE_MIN * 60_000;
  const aguardando = !data || data.status === "aguardando";
  const esperandoVotos = data && data.status === "apurando" && parado && !data.demo;

  // O aviso "você está na lista" some sozinho a partir das 00h do dia da eleição (ou quando a apuração real começa)
  const diaDaEleicao =
    Date.now() >= new Date(`${ELECTION_ISO.slice(0, 10)}T00:00:00-03:00`).getTime() ||
    Boolean(data && !data.previa && !data.demo && data.status !== "aguardando");

  const link = refCode ? `${SITE_URL}/?ref=${refCode}` : SITE_URL;
  const share = `Estou acompanhando a apuração do 2º turno ao vivo aqui. Entra na lista pra ser avisado: ${link}`;

  if (tv && data?.br) {
    return <TvView data={data} cor={cor} uf={uf} onSelect={setUf} onExit={sairTv} />;
  }

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 pb-16 pt-5 lg:px-6">
      {novo && !diaDaEleicao ? (
        <div className="mb-4 rounded-2xl border border-lime/40 bg-panel p-4">
          <p className="font-semibold">Você está na lista ✓</p>
          <p className="mt-1 text-sm text-mute">
            Esta é a página onde a apuração do 2º turno vai acontecer, ao vivo. No dia 25 avisamos você por e-mail
            {" "}e WhatsApp quando começar. Por enquanto, explore.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(share)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-xl bg-lime px-4 text-sm font-semibold text-ink"
            >
              Chamar amigos no WhatsApp
            </a>
            <button
              onClick={() => navigator.clipboard?.writeText(link)}
              className="h-11 rounded-xl border border-line px-4 text-sm"
            >
              Copiar meu link
            </button>
          </div>
        </div>
      ) : null}

      {data?.demo ? (
        <p className="mb-4 rounded-lg border border-amber/50 px-3 py-2 text-xs text-amber">
          DEMONSTRAÇÃO — números fictícios para você ver como a página funciona.
        </p>
      ) : data?.previa ? (
        <p className="mb-4 rounded-lg border border-amber/50 px-3 py-2 text-xs text-amber">
          PRÉVIA — estes são os resultados do 1º turno (dados oficiais do TSE), para você ver como a página funciona. No
          dia 25 ela passa a mostrar o 2º turno ao vivo.
        </p>
      ) : null}

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Apuração do {data?.turno === 1 ? "1º" : "2º"} turno</h1>
          <Credito compact />
          <p className="tabular text-xs text-mute">
            {data?.br
              ? `${fmtPct(data.br.pctApurado, 2)}% das seções apuradas`
              : "Aguardando o TSE iniciar a divulgação"}
            {erro ? " · reconectando…" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setUf(uf === "ZZ" ? null : "ZZ")}
            aria-pressed={uf === "ZZ"}
            className={`h-10 rounded-xl border px-4 text-sm ${uf === "ZZ" ? "border-lime bg-lime text-ink" : "border-line"}`}
          >
            Exterior
          </button>
          <button onClick={compartilhar} className="h-10 rounded-xl border border-line px-4 text-sm">
            {copiado ? "Link copiado ✓" : "Compartilhar"}
          </button>
          <button onClick={entrarTv} className="h-10 rounded-xl border border-line px-4 text-sm">
            Tela cheia
          </button>
        </div>
      </header>

      {esperandoVotos ? (
        <p className="mb-4 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-mute" role="status">
          <span className="pulse-dot mr-2 inline-block h-2 w-2 rounded-full bg-amber align-middle" />
          Esperando novos votos serem contabilizados…
        </p>
      ) : null}

      {aguardando && !data?.br ? (
        <div className="rounded-2xl border border-line bg-panel p-8 text-center" role="status">
          <p className="font-display text-2xl">Aguardando os primeiros votos</p>
          <p className="mt-2 text-sm text-mute">
            A divulgação começa quando as urnas fecham, às 17h (Brasília). Esta página atualiza sozinha.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_300px] lg:items-start xl:grid-cols-[340px_minmax(0,1fr)_360px]">
          <div className="contents lg:flex lg:flex-col lg:gap-4">
            <div className="order-1 lg:order-none">
              <Placar br={data?.br ?? null} cor={cor} />
            </div>
            <div className="order-3 lg:order-none">{data ? <Projecao p={data.projecao} cor={cor} /> : null}</div>
            <div className="order-6 lg:order-none">
              <Linha pontos={data?.historico ?? []} cor={cor} />
            </div>
            <div className="order-7 lg:order-none">
              <Regioes ufs={data?.ufs ?? {}} cor={cor} />
            </div>
          </div>

          <div className="order-2 grid gap-4 lg:order-none lg:content-start">
            {uf === "ZZ" ? (
              <MapaExterior total={data?.ufs["ZZ"]} cor={cor} onVoltar={() => setUf(null)} />
            ) : (
              <div className="rounded-2xl border border-line bg-panel p-3 sm:p-5">
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs" role="tablist" aria-label="Modo do mapa">
                  {(
                    [
                      ["estados", "Estados"],
                      ["vantagem", "Vantagem"],
                      ["apurado", "Apurado"],
                    ] as [ModoMapa, string][]
                  ).map(([m, nome]) => (
                    <button
                      key={m}
                      role="tab"
                      aria-selected={modo === m}
                      onClick={() => setModo(m)}
                      className={`h-8 rounded-lg border px-3 ${modo === m ? "border-lime bg-lime text-ink" : "border-line text-mute"}`}
                    >
                      {nome}
                    </button>
                  ))}
                  <select
                    aria-label="Mapa de um candidato"
                    value={modo === "candidato" && candN != null ? String(candN) : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCandN(Number(e.target.value));
                        setModo("candidato");
                      } else setModo("estados");
                    }}
                    className={`h-8 rounded-lg border bg-panel px-2 ${modo === "candidato" ? "border-lime text-paper" : "border-line text-mute"}`}
                  >
                    <option value="">Candidato…</option>
                    {(data?.br?.cands ?? []).map((c) => (
                      <option key={c.sq} value={c.n}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <MapaBR ufs={data?.ufs ?? {}} cor={cor} selecionada={uf} onSelect={setUf} modo={modo} candN={candN} />
                <Legenda cands={data?.br?.cands ?? []} />
                <p className="mt-1 text-center text-[11px] text-mute">Toque em um estado · cor = bloco de quem lidera · intensidade = margem</p>
              </div>
            )}
            {uf && uf !== "ZZ" ? <PainelUF uf={uf} area={data?.ufs[uf]} cor={cor} onClose={() => setUf(null)} /> : null}
          </div>

          <div className="contents lg:flex lg:flex-col lg:gap-4">
            <div className="order-4 lg:order-none">
              <LiveBox />
            </div>
            <div className="order-4 lg:order-none">
              <Atualizacoes eventos={data?.eventos ?? []} cor={cor} />
            </div>
            <div className="order-5 lg:order-none">
              <ToqyCard />
            </div>
            <div className="order-8 grid gap-4 lg:order-none">
              <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDE} height={250} label="Anuncie aqui" />
              <SponsorSlot label="Sua marca na apuração" />
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER} height={120} label="Anuncie aqui · faixa grande" />
      </div>

      <footer className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-mute">
        <p className="mb-2">
          <Credito />
        </p>
        <p>
          Dados oficiais: TSE (resultados.tse.jus.br). Projeção e cálculos de diferença são estimativas do site e não
          substituem o resultado oficial. Projeto independente, sem vínculo com o TSE, partidos ou campanhas. Mapa:
          @svg-maps/brazil (CC BY 4.0).
        </p>
        <p className="mt-2">
          <a href="/" className="underline">
            Início
          </a>{" "}
          ·{" "}
          <a href="/privacidade" className="underline">
            Privacidade
          </a>
        </p>
      </footer>
    </div>
  );
}
