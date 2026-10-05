"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapaBR from "./MapaBR";
import Placar from "./Placar";
import Projecao from "./Projecao";
import Regioes from "./Regioes";
import Atualizacoes from "./Atualizacoes";
import PainelUF from "./PainelUF";
import SponsorSlot from "./SponsorSlot";
import { fmtPct, makeCor, type Payload } from "./types";
import { SITE_URL } from "@/lib/env";

const POLL_MS = 15_000;
const STALE_MIN = 4; // minutos sem mudança => mensagem de espera
const LS_REF = "apuracao:ref";

export default function ApuracaoClient() {
  const [data, setData] = useState<Payload | null>(null);
  const [erro, setErro] = useState(false);
  const [uf, setUf] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [full, setFull] = useState(false);
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
    } catch {
      setNovo(q.get("novo") === "1");
    }
  }, []);

  // Tela cheia estável: o elemento raiz nunca é remontado e a tela é mantida acordada
  useEffect(() => {
    const onFs = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  useEffect(() => {
    if (!full) return;
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
  }, [full]);
  const toggleFull = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* iOS Safari não permite em páginas */
    }
  }, []);

  const cor = useMemo(() => makeCor(data?.br?.cands.map((c) => c.n) ?? []), [data]);

  const parado = Date.now() - lastChange.current.at > STALE_MIN * 60_000;
  const aguardando = !data || data.status === "aguardando";
  const esperandoVotos = data && data.status === "apurando" && parado && !data.demo;

  const link = refCode ? `${SITE_URL}/?ref=${refCode}` : SITE_URL;
  const share = `Estou acompanhando a apuração do 2º turno ao vivo aqui. Entra na lista pra ser avisado: ${link}`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-5">
      {novo ? (
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
          <p className="tabular text-xs text-mute">
            {data?.br
              ? `${fmtPct(data.br.pctApurado, 2)}% das seções apuradas`
              : "Aguardando o TSE iniciar a divulgação"}
            {erro ? " · reconectando…" : ""}
          </p>
        </div>
        <button onClick={toggleFull} className="h-10 rounded-xl border border-line px-4 text-sm">
          {full ? "Sair da tela cheia" : "Tela cheia"}
        </button>
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
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid content-start gap-4">
            <Placar br={data?.br ?? null} cor={cor} />
            <div className="rounded-2xl border border-line bg-panel p-3 sm:p-5">
              <MapaBR ufs={data?.ufs ?? {}} cor={cor} selecionada={uf} onSelect={setUf} />
              <p className="mt-2 text-center text-[11px] text-mute">Toque em um estado · cor = quem lidera, intensidade = margem</p>
            </div>
            {uf ? <PainelUF uf={uf} area={data?.ufs[uf]} cor={cor} onClose={() => setUf(null)} /> : null}
          </div>
          <div className="grid content-start gap-4">
            {data ? <Projecao p={data.projecao} cor={cor} /> : null}
            <Regioes ufs={data?.ufs ?? {}} cor={cor} />
            <Atualizacoes eventos={data?.eventos ?? []} />
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SponsorSlot label="Anuncie aqui" />
        <SponsorSlot label="Sua marca na apuração" />
      </div>

      <footer className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-mute">
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
