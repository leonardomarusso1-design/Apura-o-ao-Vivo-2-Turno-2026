"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { REACOES, STICKERS, stickerDe } from "@/lib/chat-stickers";

type Msg = { id: string; t: number; u: string; m: string; r?: { u: string; m: string }; sv?: number };
const VALORES = [5, 10, 20, 50, 100];
const corSuper = (v: number) => (v >= 100 ? "#f43f5e" : v >= 50 ? "#fb923c" : v >= 20 ? "#facc15" : v >= 10 ? "#4ade80" : "#38bdf8");
type Me = { logado: boolean; nick?: string };

const CID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

type Gis = {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
      renderButton: (el: HTMLElement, o: { theme?: string; size?: string; text?: string; shape?: string; locale?: string; width?: number }) => void;
    };
  };
};
declare global {
  interface Window {
    google?: Gis;
  }
}

const CORES = ["#f87171", "#fb923c", "#facc15", "#a3e635", "#4ade80", "#2dd4bf", "#38bdf8", "#818cf8", "#c084fc", "#f472b6"];
const corDe = (n: string) => {
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  return CORES[h % CORES.length];
};
const EMOJIS = [
  "😀", "😂", "🤣", "😍", "😎", "🥳", "😭", "😡", "😱", "😮", "🤔", "🙄", "😅", "😬", "🥲", "😴",
  "👏", "🙌", "👍", "👎", "🙏", "💪", "🤝", "✌️", "🫡", "🤞", "👀", "🧠", "❤️", "💚", "💛", "💙",
  "🔥", "⚡", "🎉", "🏆", "🇧🇷", "🗳️", "📺", "📊", "⏳", "🚨", "💥", "✅", "❌", "🤯", "🤡", "🫠",
];
const fmtN = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

/** Bate-papo ao vivo em painel lateral: login com Google + apelido. Só consulta quando está aberto. Sem GOOGLE_CLIENT_ID não aparece. */
export default function ChatApuracao({ aberto, onFechar, online }: { aberto: boolean; onFechar: () => void; online: number | null }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [off, setOff] = useState(false);
  const [me, setMe] = useState<Me>({ logado: false });
  const [apelido, setApelido] = useState("");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [emotes, setEmotes] = useState(false);
  const [figs, setFigs] = useState(false);
  const [top, setTop] = useState<{ u: string; v: number }[]>([]);
  const [superAb, setSuperAb] = useState(false);
  const [superV, setSuperV] = useState(10);
  const [superOk, setSuperOk] = useState(false);
  const [pix, setPix] = useState<{ pix: string; qr: string } | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [resp, setResp] = useState<Msg | null>(null);
  const [flut, setFlut] = useState<{ k: number; e: string; x: number; d: number }[]>([]);
  const rxPrev = useRef<Record<string, number> | null>(null);
  const rxPropria = useRef<Record<string, number>>({});
  const rxFila = useRef<Record<string, number>>({});
  const rxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const soltar = useCallback((id: string, n: number, janelaMs: number) => {
    const e = REACOES.find((r) => r.id === id)?.e;
    if (!e) return;
    for (let i = 0; i < Math.min(n, 10); i++) {
      setTimeout(() => {
        const k = ++seq.current;
        setFlut((f) => [...f.slice(-30), { k, e, x: Math.round(Math.random() * 70), d: 2.2 + Math.random() * 1.2 }]);
        setTimeout(() => setFlut((f) => f.filter((x) => x.k !== k)), 3600);
      }, Math.random() * janelaMs);
    }
  }, []);

  const reagir = (id: string) => {
    if (document.hidden) return;
    soltar(id, 1, 0);
    rxPropria.current[id] = (rxPropria.current[id] ?? 0) + 1;
    rxFila.current[id] = Math.min(10, (rxFila.current[id] ?? 0) + 1);
    if (rxTimer.current) return;
    rxTimer.current = setTimeout(() => {
      rxTimer.current = null;
      const fila = rxFila.current;
      rxFila.current = {};
      for (const [rid, n] of Object.entries(fila)) void fetch("/api/chat/reacao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rid, n }) }).catch(() => undefined);
    }, 900);
  };
  const [novas, setNovas] = useState(false);
  const ultimoId = useRef("");
  const lista = useRef<HTMLDivElement>(null);
  const colado = useRef(true);
  const btn = useRef<HTMLDivElement>(null);
  const apelidoRef = useRef("");
  apelidoRef.current = apelido;

  const ler = useCallback(async () => {
    try {
      const r = await fetch("/api/chat");
      if (!r.ok) return;
      const j = (await r.json()) as { off: boolean; msgs: Msg[]; rx?: Record<string, number>; top?: { u: string; v: number }[] };
      setOff(j.off);
      setMsgs(j.msgs);
      setTop(j.top ?? []);
      if (j.rx) {
        const ant = rxPrev.current;
        rxPrev.current = j.rx;
        if (ant) {
          for (const [id, tot] of Object.entries(j.rx)) {
            let d = tot - (ant[id] ?? 0);
            const meu = Math.min(d, rxPropria.current[id] ?? 0);
            rxPropria.current[id] = (rxPropria.current[id] ?? 0) - meu;
            d -= meu;
            if (d > 0) soltar(id, d, 4500);
          }
        }
      }
    } catch {
      /* mantém */
    }
  }, [soltar]);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    let t: ReturnType<typeof setTimeout>;
    void fetch("/api/chat/me", { cache: "no-store" })
      .then((r) => r.json() as Promise<Me>)
      .then((j) => vivo && setMe(j))
      .catch(() => undefined);
    const ciclo = async () => {
      if (!document.hidden) await ler();
      if (vivo) t = setTimeout(ciclo, 5000);
    };
    void ciclo();
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [aberto, ler]);

  useEffect(() => {
    const el = lista.current;
    const id = msgs.length ? msgs[msgs.length - 1].id : "";
    if (el && colado.current) {
      el.scrollTop = el.scrollHeight;
      setNovas(false);
    } else if (id && id !== ultimoId.current && ultimoId.current) setNovas(true);
    ultimoId.current = id;
  }, [msgs, aberto]);

  const entrar = useCallback(async (credential: string) => {
    setErro("");
    try {
      const r = await fetch("/api/chat/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential, nick: apelidoRef.current }) });
      const j = (await r.json()) as { ok: boolean; nick?: string; erro?: string };
      if (j.ok && j.nick) setMe({ logado: true, nick: j.nick });
      else setErro(j.erro ?? "Não foi possível entrar.");
    } catch {
      setErro("Sem conexão.");
    }
  }, []);

  useEffect(() => {
    if (!aberto || me.logado || !CID) return;
    const montar = () => {
      const g = window.google;
      if (!g || !btn.current) return;
      g.accounts.id.initialize({ client_id: CID, callback: (r) => void entrar(r.credential) });
      btn.current.innerHTML = "";
      g.accounts.id.renderButton(btn.current, { theme: "filled_black", size: "large", text: "continue_with", shape: "pill", locale: "pt-BR", width: 300 });
    };
    if (window.google) return montar();
    const ja = document.getElementById("gsi-client");
    if (ja) {
      ja.addEventListener("load", montar);
      return () => ja.removeEventListener("load", montar);
    }
    const s = document.createElement("script");
    s.id = "gsi-client";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = montar;
    document.head.appendChild(s);
  }, [aberto, me.logado, entrar]);

  const mandar = async (m: string) => {
    if (!m.trim() || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ m, re: resp?.id }) });
      const j = (await r.json()) as { ok: boolean; erro?: string };
      if (j.ok) {
        setTexto("");
        setResp(null);
        setFigs(false);
        colado.current = true;
        void ler();
      } else {
        if (r.status === 401) setMe({ logado: false });
        setErro(j.erro ?? "Não enviou.");
      }
    } catch {
      setErro("Sem conexão.");
    } finally {
      setEnviando(false);
    }
  };

  const abrirSuper = () => {
    setSuperAb((v) => !v);
    setFigs(false);
    setEmotes(false);
    setSuperOk(false);
    if (!pix)
      void fetch("/api/pix", { cache: "no-store" })
        .then((r) => r.json() as Promise<{ ok: boolean; pix?: string; qr?: string }>)
        .then((j) => j.ok && j.pix && j.qr && setPix({ pix: j.pix, qr: j.qr }))
        .catch(() => undefined);
  };

  const enviarSuper = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      const r = await fetch("/api/chat/super", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ m: texto, v: superV }) });
      const j = (await r.json()) as { ok: boolean; erro?: string };
      if (j.ok) {
        setSuperOk(true);
        setTexto("");
      } else setErro(j.erro ?? "Não enviou.");
    } catch {
      setErro("Sem conexão.");
    } finally {
      setEnviando(false);
    }
  };

  const sair = async () => {
    await fetch("/api/chat/login", { method: "DELETE" }).catch(() => undefined);
    setMe({ logado: false });
  };

  if (!CID || !aberto) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-line bg-ink shadow-2xl sm:w-[380px]" aria-label="Chat ao vivo">
      <style>{`@keyframes chatPop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}.chat-fig{animation:chatPop .35s ease-out}@keyframes chatFlut{0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:1}100%{transform:translateY(-300px) scale(1.2);opacity:0}}.chat-flut{animation:chatFlut 3s ease-out forwards}@media (prefers-reduced-motion:reduce){.chat-fig,.chat-flut{animation:none}}`}</style>
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-bold">Chat ao vivo</h2>
          {online ? <span className="text-xs text-mute">👥 {fmtN(online)}</span> : null}
        </div>
        <button type="button" onClick={onFechar} className="h-8 rounded-full border border-line px-3 text-xs font-semibold hover:bg-white/5">
          ✕ Fechar chat
        </button>
      </header>

      {top.length ? (
        <div className="flex gap-1.5 overflow-x-auto border-b border-line px-3 py-1.5 text-[11px]" aria-label="Maiores apoiadores do chat">
          {top.map((t, i) => (
            <span key={t.u} className="flex shrink-0 items-center gap-1 rounded-full border border-line px-2 py-0.5">
              <b className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-ink" style={{ background: ["#facc15", "#cbd5e1", "#fb923c"][i] }}>{i + 1}</b>
              <span className="max-w-[90px] truncate font-semibold">{t.u}</span>
              <span className="text-mute">R$ {t.v}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div
        ref={lista}
        onScroll={(e) => {
          const el = e.currentTarget;
          colado.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
          if (colado.current) setNovas(false);
        }}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
        role="log"
        aria-live="polite"
      >
        {msgs.length === 0 ? <p className="text-sm text-mute">Ninguém falou ainda. Seja o primeiro!</p> : null}
        {msgs.map((m) => {
          const fig = stickerDe(m.m);
          return (
            <div key={m.id} className="group py-[3px]">
              {m.r ? (
                <p className="truncate pl-3 text-[11px] leading-tight text-mute">
                  ↪ <span className="font-semibold" style={{ color: corDe(m.r.u) }}>{m.r.u}</span> {stickerDe(m.r.m)?.e ?? m.r.m}
                </p>
              ) : null}
              <div className="flex items-start gap-1.5">
                {fig ? (
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold leading-tight" style={{ color: corDe(m.u) }}>{m.u}</p>
                    <span className="chat-fig inline-block text-[44px] leading-none" role="img" aria-label={fig.nome}>{fig.e}</span>
                  </div>
                ) : m.sv ? (
                  <div className="min-w-0 flex-1 rounded-xl px-2.5 py-1.5" style={{ background: `${corSuper(m.sv)}22`, border: `1px solid ${corSuper(m.sv)}` }}>
                    <p className="flex items-center gap-1.5 text-[12px] font-bold leading-tight">
                      <span style={{ color: corSuper(m.sv) }}>{m.u}</span>
                      <span className="rounded-full px-1.5 py-px text-[10px] text-ink" style={{ background: corSuper(m.sv) }}>R$ {m.sv}</span>
                    </p>
                    <p className="mt-0.5 break-words text-[13px] leading-[1.3] text-paper">{m.m}</p>
                  </div>
                ) : (
                  <p className="min-w-0 flex-1 break-words text-[13px] leading-[1.3]">
                    <strong style={{ color: corDe(m.u) }}>{m.u}:</strong> <span className="text-paper/95">{m.m}</span>
                  </p>
                )}
                {me.logado ? (
                  <button type="button" onClick={() => setResp(m)} aria-label={`Responder ${m.u}`} className="shrink-0 rounded px-1 text-xs text-mute opacity-50 hover:bg-white/10 hover:opacity-100 group-hover:opacity-100">
                    ↩
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {novas ? (
        <button
          type="button"
          onClick={() => {
            const el = lista.current;
            if (el) el.scrollTop = el.scrollHeight;
            colado.current = true;
            setNovas(false);
          }}
          className="mx-auto -mt-10 mb-2 h-8 rounded-full bg-lime px-4 text-xs font-semibold text-ink shadow-lg"
        >
          ↓ Chat pausado · novas mensagens
        </button>
      ) : null}

      <div className="border-t border-line px-3 pb-3 pt-2">
        {off ? (
          <p className="text-sm text-amber">O chat está pausado agora.</p>
        ) : me.logado ? (
          <div className="grid gap-1.5">
            {resp ? (
              <div className="flex items-center gap-2 rounded-lg border border-line bg-white/5 px-2 py-1 text-[11px]">
                <span className="min-w-0 flex-1 truncate">↪ Respondendo <b style={{ color: corDe(resp.u) }}>{resp.u}</b>: {stickerDe(resp.m)?.e ?? resp.m}</span>
                <button type="button" onClick={() => setResp(null)} aria-label="Cancelar resposta" className="px-1 text-mute hover:text-paper">✕</button>
              </div>
            ) : null}
            <div className="flex gap-1.5" aria-label="Reações rápidas">
              {REACOES.map((r) => (
                <button key={r.id} type="button" onClick={() => reagir(r.id)} aria-label={`Reagir ${r.id}`} className="h-8 w-8 rounded-full border border-line text-sm font-bold hover:bg-white/10 active:scale-90">
                  {r.e}
                </button>
              ))}
              <button type="button" onClick={() => { setFigs((v) => !v); setEmotes(false); }} aria-expanded={figs} className="ml-auto h-8 rounded-full border border-line px-3 text-xs font-semibold hover:bg-white/10">
                🎭 Figurinhas
              </button>
            </div>
            {superAb ? (
              <div className="rounded-2xl border border-line bg-panel p-3 text-xs" role="dialog" aria-label="Super chat">
                {superOk ? (
                  <p className="text-sm">Recebemos seu recado ✓ Assim que confirmarmos o Pix, ele aparece destacado no chat.</p>
                ) : (
                  <>
                    <p className="font-semibold">Super chat · destaque seu recado</p>
                    <p className="mt-1 text-mute">1) Escolha o valor e escreva o recado no campo abaixo. 2) Pague esse valor no Pix. 3) Toque em &quot;Já paguei&quot;.</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {VALORES.map((v) => (
                        <button key={v} type="button" onClick={() => setSuperV(v)} className="h-8 rounded-full border px-3 font-bold" style={superV === v ? { background: corSuper(v), color: "#0b0f14", borderColor: corSuper(v) } : { borderColor: "var(--line, #2a3340)" }}>
                          R$ {v}
                        </button>
                      ))}
                    </div>
                    {pix ? (
                      <div className="mt-2 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pix.qr} width={96} height={96} alt="QR Code Pix" className="rounded-lg bg-white p-1" />
                        <div className="grid gap-1.5">
                          <p className="text-mute">Informe o valor de <b className="text-paper">R$ {superV}</b> no seu banco.</p>
                          <button type="button" onClick={() => void navigator.clipboard.writeText(pix.pix).then(() => { setPixCopiado(true); setTimeout(() => setPixCopiado(false), 2000); })} className="h-8 rounded-lg border border-line px-3 font-semibold hover:bg-white/10">
                            {pixCopiado ? "Copiado ✓" : "Copiar Pix copia e cola"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-mute">Carregando o Pix…</p>
                    )}
                    <button type="button" disabled={enviando || !texto.trim()} onClick={() => void enviarSuper()} className="mt-2 h-9 w-full rounded-full bg-lime font-semibold text-ink disabled:opacity-40">
                      Já paguei R$ {superV}, enviar meu recado
                    </button>
                    <p className="mt-1 text-[10px] text-mute">Conferimos o Pix manualmente. Sem pagamento confirmado, o recado não aparece. Apoio ao site, sem relação com candidatos ou partidos.</p>
                  </>
                )}
              </div>
            ) : null}
            {figs ? (
              <div className="rounded-2xl border border-line bg-panel p-2" role="dialog" aria-label="Figurinhas">
                <div className="grid max-h-[170px] grid-cols-6 gap-1 overflow-y-auto">
                  {STICKERS.map((f) => (
                    <button key={f.id} type="button" disabled={enviando} title={f.nome} onClick={() => void mandar(`:s:${f.id}:`)} className="h-12 rounded-xl text-3xl transition hover:scale-110 hover:bg-white/10 disabled:opacity-40">
                      {f.e}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {emotes ? (
              <div className="rounded-2xl border border-line bg-panel p-3" role="dialog" aria-label="Emojis">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">Emojis</span>
                  <button type="button" onClick={() => setEmotes(false)} className="h-7 w-7 rounded-full text-sm hover:bg-white/10" aria-label="Fechar emojis">
                    ✕
                  </button>
                </div>
                <div className="grid max-h-[150px] grid-cols-8 gap-1 overflow-y-auto">
                  {EMOJIS.map((e) => (
                    <button key={e} type="button" onClick={() => setTexto((t) => (t + e).slice(0, 200))} className="h-9 rounded-lg text-xl hover:bg-white/10">
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setEmotes(false);
                void mandar(texto);
              }}
              className="flex gap-2"
            >
              <div className="relative min-w-0 flex-1">
                <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} placeholder="Escreva no chat" className="h-10 w-full rounded-full border border-line bg-black/30 pl-4 pr-11 text-sm text-paper outline-none focus:border-lime" />
                <button type="button" onClick={() => { setEmotes((v) => !v); setFigs(false); }} aria-label="Abrir emojis" aria-expanded={emotes} className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-lg hover:bg-white/10">
                  🙂
                </button>
              </div>
              <button type="button" onClick={abrirSuper} aria-label="Super chat" aria-expanded={superAb} title="Super chat: destaque seu recado" className="h-10 w-10 shrink-0 rounded-full border border-line text-base hover:bg-white/10">
                💰
              </button>
              <button type="submit" disabled={enviando || !texto.trim()} className="h-10 rounded-full bg-lime px-4 text-sm font-semibold text-ink disabled:opacity-40">
                Enviar
              </button>
            </form>
            <p className="text-[11px] text-mute">
              Como <strong className="text-paper">{me.nick}</strong> ·{" "}
              <button type="button" onClick={() => void sair()} className="underline">
                trocar
              </button>{" "}
              ·{" "}
              <button type="button" onClick={() => void sair()} className="underline">
                sair
              </button>{" "}
              · Chat moderado
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            <p className="text-sm font-semibold">Entre para escrever</p>
            <p className="text-xs text-mute">Seu apelido aparece ao lado das suas mensagens. O e-mail, não.</p>
            <input value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={16} placeholder="Escolha seu apelido (3 a 16 letras)" className="h-11 rounded-full border border-line bg-black/30 px-4 text-sm text-paper outline-none focus:border-lime" />
            <div ref={btn} className="min-h-[44px]" />
          </div>
        )}
        {erro ? <p className="mt-2 text-xs text-amber">{erro}</p> : null}
        <p className="mt-1.5 text-[10px] leading-snug text-mute">Sem palavrões, ofensas, links ou spam: a conta é bloqueada. Conversa entre usuários, sem relação com o TSE.</p>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 h-0 overflow-visible" aria-hidden>
        {flut.map((f) => (
          <span key={f.k} className="chat-flut absolute bottom-0 text-3xl" style={{ right: `${8 + f.x}px`, animationDuration: `${f.d}s` }}>
            {f.e === "BR" ? <b className="rounded-full bg-[#009c3b] px-2 py-0.5 text-base text-[#ffdf00]">BR</b> : f.e}
          </span>
        ))}
      </div>
    </aside>
  );
}
