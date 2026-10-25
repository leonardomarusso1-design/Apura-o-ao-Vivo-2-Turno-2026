"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapaBR, { type ModoMapa } from "./MapaBR";
import Placar from "./Placar";
import Projecao from "./Projecao";
import Participacao from "./Participacao";
import Regioes from "./Regioes";
import Atualizacoes from "./Atualizacoes";
import PainelUF from "./PainelUF";
import LiveBox from "./LiveBox";
import dynamic from "next/dynamic";
import BuscaModal from "./BuscaModal";
import MapaMunicipios from "./MapaMunicipios";
import BarraTempo from "./BarraTempo";
import AdSlot from "../ads/AdSlot";
import ToqyCard from "./ToqyCard";
import { fmtPct, makeCor, type Payload } from "./types";
import type { PontoReplay } from "@/lib/apuracao/types";
import ApoieModal from "./ApoieModal";
import { TurnoContext } from "./TurnoContext";
import ChatApuracao from "./ChatApuracao";
import BarraDisputa from "./BarraDisputa";
import SeletorCandidato from "./SeletorCandidato";
import PainelCandidato from "./PainelCandidato";
import type { ResumoMun } from "./MapaMunicipiosBR";
import Linha from "./Linha";
import MudouDesde1 from "./MudouDesde1";
import SlotMapa from "./SlotMapa";

import Credito from "../Credito";
import { track } from "@/lib/track";
import { SITE_URL, ELECTION_ISO } from "@/lib/env";
import { marcarInscrito } from "@/lib/inscrito";

const POLL_MS = 8_000;
const STALE_MIN = 4; // minutos sem mudança => mensagem de espera
const LS_REF = "apuracao:ref";

// Partes pesadas só são baixadas quando usadas (o mapa-múndi tem ~100 KB)
const MapaExterior = dynamic(() => import("./MapaExterior"), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-2xl border border-line bg-panel" />,
});
const Governadores = dynamic(() => import("./Governadores"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl border border-line bg-panel" />,
});
const MapaMunicipiosBR = dynamic(() => import("./MapaMunicipiosBR"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[300px] animate-pulse rounded-2xl bg-panel" />,
});
const Legislativo = dynamic(() => import("./Legislativo"), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-2xl bg-panel" />,
});
const TvView = dynamic(() => import("./TvView"), { ssr: false });

const horaBR = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).replace(":", "h");

/** Reconstrói a tela como estava num ponto gravado (placar, líder e % de cada estado). */
function aplicarReplay(live: Payload, p: PontoReplay): Payload {
  const t = new Date(p.t).getTime();
  const br = live.br
    ? {
        ...live.br,
        pctApurado: p.pct,
        cands: p.c
          .map((pc) => {
            const base = live.br!.cands.find((c) => c.n === pc.n);
            return base ? { ...base, pct: pc.pct, votos: pc.v } : null;
          })
          .filter((c): c is NonNullable<typeof c> => c !== null),
      }
    : live.br;
  const ufs: Payload["ufs"] = {};
  for (const [id, a] of Object.entries(live.ufs)) {
    const u = p.u[id];
    if (!u) {
      ufs[id] = { ...a, pctApurado: 0, cands: [], definidoTse: false };
      continue;
    }
    const lider = a.cands.find((c) => c.n === u[0]);
    ufs[id] = {
      ...a,
      pctApurado: u[1],
      definidoTse: false,
      cands: lider ? [lider, ...a.cands.filter((c) => c.n !== u[0])] : a.cands,
    };
  }
  return {
    ...live,
    br,
    ufs,
    eventos: live.eventos.filter((e) => new Date(e.t).getTime() <= t),
    historico: live.historico.filter((h) => new Date(h.t).getTime() <= t),
  };
}

export default function ApuracaoClient({ initial = null, turno = 2, pixAtivo = false }: { initial?: Payload | null; turno?: 1 | 2; pixAtivo?: boolean }) {
  const [apoie, setApoie] = useState(false);
  const [dataLive, setData] = useState<Payload | null>(initial);
  const [pontos, setPontos] = useState<PontoReplay[]>([]);
  const [ri, setRi] = useState<number | null>(null); // null = ao vivo
  const data = useMemo(() => (ri === null || !dataLive || !pontos[ri] ? dataLive : aplicarReplay(dataLive, pontos[ri])), [dataLive, pontos, ri]);
  const [erro, setErro] = useState(false);
  const [uf, setUf] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [tv, setTv] = useState(false);
  const [chatAberto, setChatAberto] = useState(false);
  const [modo, setModo] = useState<ModoMapa | "municipios">("estados");
  const [resumoMun, setResumoMun] = useState<ResumoMun[]>([]);
  const [online, setOnline] = useState<number | null>(null);
  const [candN, setCandN] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [busca, setBusca] = useState(false);
  const [menu, setMenu] = useState(false);
  const [aba, setAba] = useState<"presidente" | "governadores" | "senado" | "federais" | "estaduais">("presidente");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBusca((b) => !b);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        if (!document.hidden) {
          const r = await fetch("/api/stats");
          if (r.ok && alive) setOnline(((await r.json()) as { online: number | null }).online ?? null);
        }
      } catch {
        /* mantém */
      }
      if (alive) t = setTimeout(load, 20_000);
    };
    void load();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);
  const gravando = Boolean(turno === 2 && dataLive && !dataLive.previa && !dataLive.demo && dataLive.status !== "aguardando");
  useEffect(() => {
    if (!gravando) return;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/historico?t=${turno}`);
        if (!r.ok) return;
        const j = (await r.json()) as { pontos: PontoReplay[] };
        if (alive && Array.isArray(j.pontos)) setPontos(j.pontos);
      } catch {
        /* sem replay */
      }
    };
    void load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [gravando, turno]);
  const lastChange = useRef<{ key: string; at: number }>({ key: "", at: Date.now() });
  const [, force] = useState(0);

  // Polling leve: pausa com a aba escondida e volta ao reabrir
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const r = await fetch(`/api/apuracao?t=${turno}`);
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
  }, [turno]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    try {
      const saved = localStorage.getItem(LS_REF);
      setRefCode(saved && saved !== "-" ? saved : null);
      setNovo(q.get("novo") === "1" || Boolean(saved));
      if (q.get("tv") === "1" || q.get("obs") === "1") setTv(true); // link direto para o OBS
      if (saved) marcarInscrito();
    } catch {
      setNovo(q.get("novo") === "1");
      if (q.get("tv") === "1" || q.get("obs") === "1") setTv(true);
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
    const url = `${SITE_URL}/apuracao/${turno}`;
    const br = data?.br;
    const lider = br?.cands?.[0];
    const bonito = (n: string) => n.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
    const texto =
      br && br.pctApurado > 0 && lider && !data?.demo && !data?.previa
        ? `Começou a apuração. ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(br.pctApurado)}% apurado, ${bonito(lider.nome)} na frente com ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(lider.pct)}%.\nAcompanhe ao vivo, atualiza sozinho:\n${url}`
        : `🗳️ Apuração do ${turno}º turno AO VIVO, atualizando sozinha (dados do TSE)\nPlacar, mapa por estado e projeção:\n${url}`;
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else {
        await navigator.clipboard.writeText(texto);
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

  const horaHM = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).replace(":", "h");
  const statusTxt = data?.br
    ? data.previa && data.br.totalizadoEm
      ? `Como estava às ${horaHM(data.br.totalizadoEm)} · ${fmtPct(data.br.pctApurado, 1)}% das seções`
      : data.br.geracao
        ? `TSE gerou às ${data.br.geracao.slice(11)} · ${fmtPct(data.br.pctApurado, 1)}% das seções`
        : `Atualizado às ${horaHM(data.geradoEm)} · ${fmtPct(data.br.pctApurado, 1)}% das seções`
    : "Aguardando o TSE iniciar a divulgação";

  // "PL 15 · PT 12 estados": quem lidera em mais estados
  const contEstados = useMemo(() => {
    const m = new Map<number, { partido: string; qt: number }>();
    for (const [k, a] of Object.entries(data?.ufs ?? {})) {
      const l = a.cands[0];
      if (!l || k === "ZZ" || a.pctApurado <= 0) continue;
      const c = m.get(l.n) ?? { partido: l.partido, qt: 0 };
      c.qt++;
      m.set(l.n, c);
    }
    return [...m.entries()].map(([n, v]) => ({ n, ...v })).sort((a, b) => b.qt - a.qt).slice(0, 2);
  }, [data]);
  // Modo TV: o retorno antecipado fica depois de todos os hooks (senão o React quebra ao entrar na tela cheia)
  if (tv) {
    return (
      <TurnoContext.Provider value={turno}>
        <TvView data={data} turno={turno} cor={cor} uf={uf} onSelect={setUf} onExit={sairTv} />
      </TurnoContext.Provider>
    );
  }

  const muniModo = modo === "municipios" || modo === "vantagem" || (modo === "candidato" && candN != null);
  const legenda: ResumoMun[] = muniModo ? resumoMun : contEstados;
  const escolherCand = (n: number) => {
    setUf(null);
    setCandN(n);
    setModo("candidato");
  };

  const abas = [
    ["presidente", "Presidente"],
    ["governadores", "Governadores"],
    ["senado", "Senado"],
    ["federais", "Deputados"],
  ] as const;
  const abaAtiva = aba === "estaduais" ? "federais" : aba;
  const btnIcone = "grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-mute transition hover:bg-white/5 hover:text-paper";
  const btnTopo = "h-8 whitespace-nowrap rounded-lg border border-line px-2.5 text-xs hover:bg-white/5";

  const aguardandoT2 = Date.now() < new Date(ELECTION_ISO).getTime();
  const trocaTurno = (
    <nav className="flex items-center gap-1 rounded-2xl border border-line bg-white/[0.03] p-1" aria-label="Rodada">
      {(
        [
          [1, "1º turno", "/apuracao/1"],
          [2, "2º turno", "/apuracao/2"],
        ] as const
      ).map(([n, nome, href]) => (
        <a
          key={n}
          href={href}
          aria-current={turno === n ? "page" : undefined}
          className={`flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold transition ${turno === n ? "bg-lime text-ink" : "text-mute hover:bg-white/10 hover:text-paper"}`}
        >
          {nome}
          {n === 2 && turno !== 2 && aguardandoT2 ? <span className="rounded bg-amber/20 px-1 text-[9px] font-bold uppercase text-amber">25/10</span> : null}
        </a>
      ))}
    </nav>
  );

  return (
    <TurnoContext.Provider value={turno}>
    <div className={`mx-auto flex w-full max-w-[1920px] flex-col px-3 pb-2 pt-1.5 lg:h-full lg:min-h-0 lg:px-3 ${chatAberto ? "lg:pr-[396px]" : ""}`}>
      {novo && !diaDaEleicao && turno === 2 ? (
        <div className="mb-3 rounded-2xl border border-lime/40 bg-panel p-3">
          <p className="text-sm font-semibold">Você está na lista ✓</p>
          <p className="mt-1 text-xs text-mute">
            No dia 25 avisamos você por e-mail quando a apuração começar. Por enquanto, explore.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(share)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-xl bg-lime px-3 text-xs font-semibold text-ink"
            >
              Chamar amigos no WhatsApp
            </a>
            <button onClick={() => navigator.clipboard?.writeText(link)} className="h-9 rounded-xl border border-line px-3 text-xs">
              Copiar meu link
            </button>
          </div>
        </div>
      ) : null}

      {data?.demo ? (
        <p className="mb-2 rounded-lg border border-amber/50 px-3 py-1.5 text-xs text-amber">
          DEMONSTRAÇÃO — números fictícios para você ver como a página funciona.
        </p>
      ) : null}

      <header className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-2 lg:flex-nowrap">
        <div className="shrink-0">
          <h1 className="font-display text-lg leading-none sm:text-xl">Apuração 2026</h1>
          <Credito compact />
        </div>
        {trocaTurno}
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-white/[0.03] p-1" role="tablist" aria-label="Cargo">
          {abas.map(([k, nome]) => (
            <button
              key={k}
              role="tab"
              aria-selected={abaAtiva === k}
              onClick={() => setAba(k)}
              className={`h-7 shrink-0 whitespace-nowrap rounded-lg px-2.5 text-xs font-medium transition ${abaAtiva === k ? "bg-white/10 text-paper" : "text-mute hover:text-paper"}`}
            >
              {nome}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          {online ? (
            <span className="tabular flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs text-emerald-200" title="Pessoas com o site aberto agora" aria-live="polite">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <strong className="text-xs text-white">{new Intl.NumberFormat("pt-BR").format(online)}</strong>
              <span className="hidden sm:inline">online</span>
            </span>
          ) : null}
          <span className="tabular hidden items-center gap-1.5 text-[11px] text-mute 2xl:flex" aria-live="polite">
            {statusTxt}
            {erro ? " · reconectando…" : ""}
          </span>
          <button onClick={() => setBusca(true)} className={btnIcone} aria-label="Buscar estado ou cidade" title="Buscar (Ctrl K)">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </button>
          <button onClick={() => { track("compartilhar", { turno }); void compartilhar(); }} className={btnIcone} aria-label="Compartilhar" title={copiado ? "Texto copiado" : "Compartilhar"}>
            {copiado ? (
              <span className="text-xs font-bold text-lime">✓</span>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
            )}
          </button>
          <button onClick={() => { track("modo_tv", { turno }); void entrarTv(); }} className={btnIcone} aria-label="Tela cheia (modo TV)" title="Tela cheia (modo TV)">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          </button>
          {pixAtivo ? (
            <button onClick={() => { track("apoie_abrir"); setApoie(true); }} className={`${btnTopo} !border-lime/60 text-lime`}>
              ♥ Apoie
            </button>
          ) : null}
          <div className="relative">
            <button onClick={() => setMenu((v) => !v)} className={btnIcone} aria-label="Mais opções" aria-haspopup="menu" aria-expanded={menu} title="Mais">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
            </button>
            {menu ? (
              <>
                <button className="fixed inset-0 z-40 cursor-default" aria-label="Fechar menu" tabIndex={-1} onClick={() => setMenu(false)} />
                <div role="menu" className="absolute right-0 top-9 z-50 w-52 rounded-xl border border-line bg-panel p-1 text-sm shadow-2xl">
                  <a role="menuitem" href="/anunciar" className="block rounded-lg px-3 py-2 text-amber hover:bg-white/5">Anunciar aqui</a>
                  <a role="menuitem" href="/apuracao/perguntas" className="block rounded-lg px-3 py-2 hover:bg-white/5">Perguntas frequentes</a>
                  <a role="menuitem" href="/jogo" className="block rounded-lg px-3 py-2 hover:bg-white/5">Jogo da espera</a>
                  <a role="menuitem" href="/privacidade" className="block rounded-lg px-3 py-2 text-mute hover:bg-white/5">Privacidade</a>
                </div>
              </>
            ) : null}
          </div>
          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
            <button
              onClick={() => { track("chat_abrir", { turno }); setChatAberto((a) => !a); }}
              aria-pressed={chatAberto}
              className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold transition ${chatAberto ? "border border-lime/60 bg-lime/10 text-lime" : "bg-lime text-ink shadow-[0_0_18px_rgba(198,242,78,0.45)] hover:brightness-110"}`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              💬 Chat ao vivo
            </button>
          ) : null}
        </div>
      </header>
      <p className="tabular mb-2 text-[11px] text-mute 2xl:hidden">{statusTxt}{erro ? " · reconectando…" : ""}</p>

      <main id="conteudo" className="min-h-0 flex-1">
        {aba !== "presidente" ? (
          <div className="pb-3 lg:h-full lg:min-h-0 lg:overflow-hidden lg:pb-0">
            {aba === "governadores" ? <Governadores /> : null}
            {aba === "senado" ? <Legislativo cargo={5} /> : null}
            {aba === "federais" || aba === "estaduais" ? (
              <div className="grid gap-3 lg:h-full lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)]">
                <div className="flex gap-1.5" role="tablist" aria-label="Casa legislativa">
                  {(
                    [
                      ["federais", "Federais"],
                      ["estaduais", "Estaduais"],
                    ] as const
                  ).map(([k, nome]) => (
                    <button
                      key={k}
                      role="tab"
                      aria-selected={aba === k}
                      onClick={() => setAba(k)}
                      className={`h-9 rounded-xl border px-4 text-sm ${aba === k ? "border-white/20 bg-white/10 text-paper" : "border-line text-mute"}`}
                    >
                      {nome}
                    </button>
                  ))}
                </div>
                <div className="lg:min-h-0"><Legislativo cargo={aba === "federais" ? 6 : 7} /></div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2 lg:h-full lg:min-h-0">
            {(aguardando && !data?.br) || (turno === 2 && !data?.demo && (data?.br?.pctApurado ?? 0) === 0) ? (
              <div className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs" role="status">
                <span className="pulse-dot inline-block h-2 w-2 shrink-0 rounded-full bg-amber" />
                <p className="min-w-0 truncate">
                  <strong className="font-semibold">{turno === 2 ? "Aguardando os primeiros votos" : "Aguardando o TSE"}</strong>
                  <span className="hidden text-mute sm:inline"> · o mapa se preenche sozinho, sem recarregar</span>
                </p>
              </div>
            ) : null}
          <BarraDisputa br={data?.br ?? null} cor={cor} turno={turno} />
          <div className={`flex flex-col gap-2 lg:grid lg:min-h-0 lg:flex-1 ${uf === "ZZ" ? "lg:grid-cols-1" : "lg:grid-cols-[270px_minmax(0,1fr)_270px] xl:grid-cols-[300px_minmax(0,1fr)_320px]"}`}>
            {/* coluna esquerda */}
            <div className={uf === "ZZ" ? "contents lg:hidden" : "contents lg:flex lg:min-h-0 lg:flex-col lg:gap-2 lg:overflow-y-auto lg:pr-1"}>
              {esperandoVotos ? (
                <p className="order-1 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-mute lg:order-none" role="status">
                  <span className="pulse-dot mr-2 inline-block h-2 w-2 rounded-full bg-amber align-middle" />
                  Esperando novos votos serem contabilizados…
                </p>
              ) : null}
              <div className="order-1 lg:order-none">
                <Placar br={data?.br ?? null} ufs={data?.ufs} cor={cor} turno={turno} onCand={escolherCand} candSel={modo === "candidato" ? candN : null} />
              </div>
              {data?.br ? (
                <div className="order-1 lg:order-none">
                  <Participacao br={data.br} />
                </div>
              ) : null}
              {turno === 2 && data?.br ? (
                <div className="order-6 lg:order-none">
                  <MudouDesde1 finalistas={data.br.cands.slice(0, 2).map((c) => ({ n: c.n, sq: c.sq, nome: c.nome }))} cor={cor} />
                </div>
              ) : null}
              <div className="order-6 lg:order-none [@media(max-height:900px)]:lg:hidden">
                <Linha pontos={data?.historico ?? []} cor={cor} nome={(n) => data?.br?.cands.find((c) => c.n === n)?.nome ?? String(n)} />
              </div>
              <div className="order-7 lg:order-none">
                {data && !(data.br && data.br.pctApurado >= 99.9) ? <Projecao p={data.projecao} cor={cor} /> : null}
              </div>
            </div>

            {/* centro: mapa */}
            <section className="order-2 flex min-h-[420px] flex-col rounded-xl border border-line bg-panel/60 p-2 lg:order-none lg:min-h-0" aria-label="Mapa">
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Modo do mapa">
                  {(
                    [
                      ["municipios", "Municípios"],
                      ["estados", "Estados"],
                      ["vantagem", "Vantagem"],
                      ["apurado", "Apurado"],
                    ] as [ModoMapa | "municipios", string][]
                  ).map(([m, nome]) => (
                    <button
                      key={m}
                      role="tab"
                      aria-selected={modo === m}
                      onClick={() => {
                        setModo(m);
                        if (uf) setUf(null);
                      }}
                      className={`h-7 rounded-lg px-2.5 transition ${modo === m && !uf ? "bg-white/10 text-paper ring-1 ring-white/25" : "text-mute hover:text-paper"}`}
                    >
                      {nome}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setAba("presidente");
                      setUf(uf === "ZZ" ? null : "ZZ");
                    }}
                    aria-pressed={uf === "ZZ"}
                    className={`h-7 rounded-lg px-2.5 transition ${uf === "ZZ" ? "bg-lime font-semibold text-ink" : "text-mute hover:text-paper"}`}
                  >
                    Exterior
                  </button>
                  <SeletorCandidato
                    cands={data?.br?.cands ?? []}
                    valor={modo === "candidato" ? candN : null}
                    cor={cor}
                    onChange={(n) => {
                      if (n != null) escolherCand(n);
                    }}
                  />
                </div>
                <ul className="tabular ml-auto flex items-center gap-3 text-mute" aria-label="Quem lidera">
                  {legenda.map((l) => (
                    <li key={l.n} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cor(l.n) }} />
                      <span style={{ color: cor(l.n) }} className="font-semibold">
                        {l.partido}
                      </span>
                      <strong className="text-paper">{l.rot ?? new Intl.NumberFormat("pt-BR").format(l.qt)}</strong>
                    </li>
                  ))}
                  <li className="hidden sm:inline">
                    {modo === "vantagem" ? "de vantagem" : modo === "candidato" ? "municípios à frente" : modo === "municipios" ? "municípios" : "estados"}
                  </li>
                </ul>
              </div>

              <div className="relative min-h-[320px] flex-1 lg:min-h-0">
                {uf === "ZZ" ? (
                  <div className="h-full overflow-y-auto">
                    <MapaExterior total={data?.ufs["ZZ"]} cor={cor} onVoltar={() => setUf(null)} />
                  </div>
                ) : uf ? (
                  <div className="flex h-full flex-col">
                    <div>
                      <button onClick={() => setUf(null)} className="h-8 rounded-lg border border-line px-3 text-xs hover:bg-white/5">
                        ← Brasil
                      </button>
                    </div>
                    <div className="min-h-0 flex-1">
                      <MapaMunicipios uf={uf} cargo={1} inicial fit />
                    </div>
                  </div>
                ) : muniModo ? (
                  <MapaMunicipiosBR
                    cor={cor}
                    onSelectUf={setUf}
                    onResumo={setResumoMun}
                    modo={modo as "municipios" | "vantagem" | "candidato"}
                    candN={candN}
                    sqDe={(n) => data?.br?.cands.find((c) => c.n === n)?.sq}
                  />
                ) : (
                  <MapaBR ufs={data?.ufs ?? {}} cor={cor} selecionada={uf} onSelect={setUf} modo={modo as ModoMapa} candN={candN} turno={turno} fit />
                )}
                <div className="pointer-events-auto absolute bottom-2 left-2 hidden w-[220px] lg:block">
                  <AdSlot indice={0} label="Anuncie aqui" />
                </div>
                <div className="pointer-events-auto absolute bottom-2 right-2 hidden w-[260px] lg:block">
                  <SlotMapa />
                </div>
              </div>
            </section>

            <div className="order-3 lg:hidden">
              <SlotMapa />
            </div>

            {/* coluna direita */}
            <div className={uf === "ZZ" ? "contents lg:hidden" : "contents lg:flex lg:min-h-0 lg:flex-col lg:gap-3 lg:overflow-y-auto lg:pr-1"}>
              {modo === "candidato" && candN != null && !uf ? (
                <div className="order-3 lg:order-none">
                  <PainelCandidato
                    n={candN}
                    br={data?.br ?? null}
                    ufs={data?.ufs ?? {}}
                    cor={cor}
                    turno={turno}
                    onVoltar={() => setModo("estados")}
                    onUf={setUf}
                  />
                </div>
              ) : null}
              {uf && uf !== "ZZ" ? (
                <div className="order-3 lg:order-none">
                  <PainelUF uf={uf} area={data?.ufs[uf]} cor={cor} turno={turno} onClose={() => setUf(null)} />
                </div>
              ) : null}
              <div className="order-4 lg:order-none lg:shrink-0">
                <Regioes ufs={data?.ufs ?? {}} cor={cor} />
              </div>
              <div className="order-5 empty:hidden lg:order-none lg:shrink-0">
                <LiveBox />
              </div>
              <div className="order-4 lg:order-none lg:min-h-[360px] lg:flex-1">
                <Atualizacoes eventos={data?.eventos ?? []} cor={cor} mural={turno === 2} pct={data?.br?.pctApurado ?? 0} />
              </div>
              <div className="order-8 lg:order-none lg:shrink-0">
                <div className="grid grid-cols-2 gap-2">
                  <AdSlot indice={2} label="Anuncie aqui" alto="h-[96px] [@media(max-height:820px)]:h-[72px]" />
                  <AdSlot indice={3} label="Anuncie aqui" alto="h-[96px] [@media(max-height:820px)]:h-[72px]" />
                </div>
              </div>
              <div className="order-5 lg:order-none lg:shrink-0 [@media(max-height:820px)]:lg:hidden">
                <ToqyCard />
              </div>
            </div>
          </div>
          </div>
        )}
      </main>

      <BarraTempo
        pontos={gravando ? pontos : []}
        ri={ri}
        setRi={setRi}
        online={online}
        ativo={aba === "presidente"}
        aoVivo={turno === 2}
        horaHM={horaHM}
      />

      <footer className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-mute lg:hidden">
        <p className="mb-2">
          <Credito />
        </p>
        <p>
          Dados oficiais: TSE (resultados.tse.jus.br). Projeção e cálculos de diferença são estimativas do site e não substituem o resultado
          oficial. Projeto independente, sem vínculo com o TSE, partidos ou campanhas.
        </p>
        <p className="mt-2">
          <a href="/" className="underline">Início</a> · <a href="/apuracao/perguntas" className="underline">Perguntas frequentes</a> · <a href="/anunciar" className="underline">Anunciar</a> · <a href="/privacidade" className="underline">Privacidade</a>
        </p>
      </footer>

      <ChatApuracao aberto={chatAberto} onFechar={() => setChatAberto(false)} online={online} />
      {pixAtivo ? <ApoieModal aberto={apoie} onClose={() => setApoie(false)} /> : null}
      <BuscaModal aberto={busca} onClose={() => setBusca(false)} onSelectUf={(u) => { setAba("presidente"); setUf(u); }} />
    </div>
    </TurnoContext.Provider>
  );
}
