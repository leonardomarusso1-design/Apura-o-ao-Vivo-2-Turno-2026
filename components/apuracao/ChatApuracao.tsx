"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { id: string; t: number; u: string; m: string };
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
const RAPIDAS = ["🔥", "👏", "😮", "😂", "🇧🇷"];
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
  const lista = useRef<HTMLDivElement>(null);
  const colado = useRef(true);
  const btn = useRef<HTMLDivElement>(null);
  const apelidoRef = useRef("");
  apelidoRef.current = apelido;

  const ler = useCallback(async () => {
    try {
      const r = await fetch("/api/chat");
      if (!r.ok) return;
      const j = (await r.json()) as { off: boolean; msgs: Msg[] };
      setOff(j.off);
      setMsgs(j.msgs);
    } catch {
      /* mantém */
    }
  }, []);

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
    if (el && colado.current) el.scrollTop = el.scrollHeight;
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
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ m }) });
      const j = (await r.json()) as { ok: boolean; erro?: string };
      if (j.ok) {
        setTexto("");
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

  const sair = async () => {
    await fetch("/api/chat/login", { method: "DELETE" }).catch(() => undefined);
    setMe({ logado: false });
  };

  if (!CID || !aberto) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-line bg-ink shadow-2xl sm:w-[380px]" aria-label="Chat ao vivo">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-lg">Chat ao vivo</h2>
          {online ? <span className="text-xs text-mute">👥 {fmtN(online)}</span> : null}
        </div>
        <button type="button" onClick={onFechar} className="h-9 rounded-full border border-line px-4 text-xs font-semibold hover:bg-white/5">
          ✕ Fechar chat
        </button>
      </header>

      <div
        ref={lista}
        onScroll={(e) => {
          const el = e.currentTarget;
          colado.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
        role="log"
        aria-live="polite"
      >
        {msgs.length === 0 ? <p className="text-sm text-mute">Ninguém falou ainda. Seja o primeiro!</p> : null}
        {msgs.map((m) => (
          <div key={m.id} className="flex gap-2.5 py-1.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-ink" style={{ background: corDe(m.u) }} aria-hidden>
              {m.u.slice(0, 1).toUpperCase()}
            </span>
            <p className="min-w-0 break-words text-[15px] leading-snug">
              <strong style={{ color: corDe(m.u) }}>{m.u}:</strong> <span className="text-paper/95">{m.m}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-line px-4 pb-4 pt-3">
        {off ? (
          <p className="text-sm text-amber">O chat está pausado agora.</p>
        ) : me.logado ? (
          <div className="grid gap-2">
            <div className="flex gap-2" aria-label="Reações rápidas">
              {RAPIDAS.map((e) => (
                <button key={e} type="button" disabled={enviando} onClick={() => void mandar(e)} className="h-9 w-9 rounded-full border border-line text-base hover:bg-white/10 disabled:opacity-40">
                  {e}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void mandar(texto);
              }}
              className="flex gap-2"
            >
              <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} placeholder={`Falar como ${me.nick}`} className="h-11 min-w-0 flex-1 rounded-full border border-line bg-black/30 px-4 text-sm text-paper outline-none focus:border-lime" />
              <button type="submit" disabled={enviando || !texto.trim()} className="h-11 rounded-full bg-lime px-5 text-sm font-semibold text-ink disabled:opacity-40">
                Enviar
              </button>
            </form>
            <button type="button" onClick={() => void sair()} className="justify-self-start text-[11px] text-mute underline">
              Sair do chat
            </button>
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
        <p className="mt-2 text-[11px] leading-snug text-mute">Respeite todo mundo. Palavrões, ofensas, links e spam são apagados e a conta é bloqueada. Conversa entre usuários, sem relação com o TSE.</p>
      </div>
    </aside>
  );
}
