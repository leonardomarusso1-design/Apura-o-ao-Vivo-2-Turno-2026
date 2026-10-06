"use client";

import { useEffect, useState } from "react";
import { idDeLive } from "@/lib/live-id";
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
  const [autoId, setAutoId] = useState<string | null>(null);
  const [manualId, setManualId] = useState<string | null>(null);
  const [chat, setChat] = useState(true);
  const [editor, setEditor] = useState(false);
  const [campo, setCampo] = useState("");
  const [host, setHost] = useState("");

  useEffect(() => {
    setHost(window.location.hostname);
    // link com ?live=... vale primeiro; depois o que foi colado neste aparelho
    let m: string | null = null;
    try {
      m = idDeLive(new URLSearchParams(window.location.search).get("live")) ?? idDeLive(localStorage.getItem("apuracao:tv:live"));
    } catch {
      /* sem armazenamento */
    }
    setManualId(m);
  }, []);

  useEffect(() => {
    let vivo = true;
    let t: ReturnType<typeof setTimeout>;
    const ler = async () => {
      try {
        const r = await fetch("/api/live");
        if (r.ok) {
          const j = (await r.json()) as { live: boolean; videoId: string | null };
          if (vivo) setAutoId(j.live ? idDeLive(j.videoId) : null);
        }
      } catch {
        /* sem live */
      }
      if (vivo) t = setTimeout(ler, 90_000);
    };
    void ler();
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, []);

  const liveId = manualId ?? autoId;
  const salvar = (id: string | null) => {
    setManualId(id);
    try {
      if (id) localStorage.setItem("apuracao:tv:live", id);
      else localStorage.removeItem("apuracao:tv:live");
    } catch {
      /* ignora */
    }
  };

  const turnoTxt = data.turno === 1 ? "1º turno" : "2º turno";
  const porVotos = [...(br?.cands ?? [])].sort((a, b) => b.votos - a.votos);
  const lider = porVotos[0];
  const dupla = (br?.cands.slice(0, 2) ?? []).sort((a, b) => a.n - b.n); // lados fixos, não trocam quando a liderança muda
  const dif = porVotos.length > 1 ? porVotos[0].votos - porVotos[1].votos : 0;
  const encerrado = Boolean(br && br.pctApurado >= 99.99) || data.status === "finalizado" || data.previa;
  const atualizado = br?.geracao ? `Geração do TSE: ${br.geracao.slice(11)}` : "";

  const c = Boolean(liveId); // com live, o placar encolhe para dar lugar ao vídeo
  const tamPct = c ? "text-[clamp(2.4rem,4.2vw,4rem)]" : "text-[clamp(3rem,9vw,8rem)]";
  const tamCand = c ? "text-[clamp(2rem,3.2vw,3.2rem)]" : "text-[clamp(2.5rem,6vw,5.5rem)]";

  const placar = (
    <section className={`flex min-h-0 flex-col justify-center rounded-3xl border border-line bg-panel ${c ? "gap-3 p-4" : "gap-5 p-5 sm:p-8"}`} aria-label="Placar">
      <div className="text-center">
        <p className={`tabular font-display ${tamPct} font-bold leading-none`}>
          {br ? <Num v={br.pctApurado} d={2} /> : "0,00"}
          <span className="ml-1 text-[0.4em] text-mute">%</span>
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-mute sm:text-sm">das seções totalizadas</p>
        <div className="mx-auto mt-2 h-2 max-w-xl overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-lime transition-all duration-700" style={{ width: `${br?.pctApurado ?? 0}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {dupla.map((k, i) => (
          <div key={k.sq} className={`flex min-w-0 flex-col gap-1.5 ${i === 1 ? "items-end text-right" : "items-start text-left"}`}>
            <Avatar n={k.n} sq={k.sq} nome={k.nome} cor={cor(k.n)} size={c ? 52 : 72} eager />
            <p className={`w-full truncate font-semibold uppercase tracking-wide ${c ? "text-sm sm:text-base" : "text-lg sm:text-2xl"}`} style={{ color: cor(k.n) }}>
              {k.nome}
              {lider && k.n === lider.n && k.votos > 0 ? <span className="ml-2 align-middle text-[10px] text-mute">LÍDER</span> : null}
            </p>
            <p className={`tabular font-display ${tamCand} font-bold leading-none`}>
              <Num v={k.pct} d={2} />
              <span className="text-[0.4em] text-mute">%</span>
            </p>
            <p className={`tabular text-mute ${c ? "text-sm" : "text-base sm:text-xl"}`}>
              <Num v={k.votos} d={0} /> votos
            </p>
          </div>
        ))}
      </div>

      {dupla.length === 2 ? (
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-black/40" aria-hidden>
          {dupla.map((k) => (
            <div key={k.sq} className="h-full transition-all duration-700" style={{ width: `${k.pct}%`, background: cor(k.n) }} />
          ))}
        </div>
      ) : null}

      {dif > 0 ? (
        <p className={`tabular text-center ${c ? "text-base" : "text-lg sm:text-2xl"}`}>
          <span className="text-mute">Diferença </span>
          <strong>{fmtInt(dif)}</strong>
          <span className="text-mute"> votos</span>
        </p>
      ) : null}
    </section>
  );

  const mapa = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-line bg-panel p-2">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <MapaBR ufs={data.ufs} cor={cor} selecionada={uf} onSelect={onSelect} tv />
      </div>
      <Legenda cands={br?.cands ?? []} />
    </div>
  );

  const botao = "h-10 shrink-0 rounded-xl border border-line px-4 text-sm text-mute hover:text-paper";

  return (
    <div className="fixed inset-0 z-50 grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] gap-3 overflow-y-auto bg-ink p-3 sm:p-5 lg:overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3">
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
          <h1 className="font-display text-xl uppercase tracking-wide sm:text-3xl">Eleições 2026 · {turnoTxt}</h1>
        </div>
        <div className="flex items-center gap-3 text-xl">
          <Hora />
          {liveId ? (
            <button onClick={() => setChat((v) => !v)} className={botao} aria-pressed={chat}>
              Chat {chat ? "ligado" : "desligado"}
            </button>
          ) : null}
          <button onClick={() => setEditor((v) => !v)} className={botao} aria-expanded={editor}>
            {liveId ? "Trocar live" : "Adicionar live"}
          </button>
          <button onClick={onExit} className={botao}>
            Sair
          </button>
        </div>
      </header>

      {editor ? (
        <form
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel p-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const id = idDeLive(campo);
            if (id) {
              salvar(id);
              setEditor(false);
              setCampo("");
            }
          }}
        >
          <label className="text-mute" htmlFor="tv-live">
            Link ou ID da live do YouTube
          </label>
          <input
            id="tv-live"
            value={campo}
            onChange={(e) => setCampo(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="h-10 min-w-[240px] flex-1 rounded-xl border border-line bg-black/30 px-3 text-paper outline-none focus:border-lime"
          />
          <button type="submit" disabled={!idDeLive(campo)} className="h-10 rounded-xl bg-lime px-4 font-semibold text-ink disabled:opacity-40">
            Mostrar
          </button>
          {manualId ? (
            <button type="button" onClick={() => salvar(null)} className={botao}>
              Remover
            </button>
          ) : null}
          <span className="w-full text-[11px] text-mute">Vale só neste aparelho. A live precisa permitir incorporação. Clique no vídeo para ligar o som.</span>
        </form>
      ) : null}

      {liveId ? (
        <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(300px,30%)_minmax(0,1fr)]">
          {placar}
          <div className="grid h-full min-h-0 gap-3 lg:grid-rows-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div className="flex min-h-0 gap-3">
              <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center rounded-3xl border border-line bg-black p-1.5">
                <div className="aspect-video max-h-full w-full max-w-full overflow-hidden rounded-2xl bg-black lg:h-full lg:w-auto">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${liveId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`}
                    title="Live do YouTube"
                    className="h-full w-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              </div>
              {chat && host ? (
                <div className="hidden min-h-0 w-[clamp(260px,22vw,380px)] shrink-0 overflow-hidden rounded-3xl border border-line bg-panel lg:block">
                  <iframe
                    src={`https://www.youtube.com/live_chat?v=${liveId}&embed_domain=${encodeURIComponent(host)}&dark_theme=1`}
                    title="Chat da live"
                    className="h-full w-full"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : null}
            </div>
            <div className="min-h-[260px] lg:min-h-0">{mapa}</div>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          {placar}
          {mapa}
        </div>
      )}

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
