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

/** Bate-papo ao vivo: login com Google + apelido. Só carrega e consulta quando a pessoa abre. Sem GOOGLE_CLIENT_ID não aparece. */
export default function ChatApuracao() {
  const [aberto, setAberto] = useState(false);
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
      if (vivo) t = setTimeout(ciclo, 6000);
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

  // Botão do Google (carrega o script só quando a pessoa abre o chat e ainda não está logada)
  useEffect(() => {
    if (!aberto || me.logado || !CID) return;
    const montar = () => {
      const g = window.google;
      if (!g || !btn.current) return;
      g.accounts.id.initialize({ client_id: CID, callback: (r) => void entrar(r.credential) });
      btn.current.innerHTML = "";
      g.accounts.id.renderButton(btn.current, { theme: "filled_black", size: "large", text: "continue_with", shape: "pill", locale: "pt-BR", width: 260 });
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

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = texto.trim();
    if (!m || enviando) return;
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

  if (!CID) return null;

  return (
    <section className="rounded-2xl border border-line bg-panel" aria-label="Bate-papo ao vivo">
      <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="font-display text-sm uppercase tracking-wide">💬 Bate-papo ao vivo</span>
        <span className="text-xs text-mute">{aberto ? "Fechar" : "Abrir"}</span>
      </button>
      {aberto ? (
        <div className="border-t border-line p-3">
          <div
            ref={lista}
            onScroll={(e) => {
              const el = e.currentTarget;
              colado.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            }}
            className="h-[240px] overflow-y-auto rounded-xl bg-black/20 p-2 text-sm"
            role="log"
            aria-live="polite"
          >
            {msgs.length === 0 ? <p className="p-2 text-xs text-mute">Ninguém falou ainda. Seja o primeiro!</p> : null}
            {msgs.map((m) => (
              <p key={m.id} className="break-words py-0.5 leading-snug">
                <strong className="text-lime">{m.u}</strong> <span className="text-paper/90">{m.m}</span>
              </p>
            ))}
          </div>

          {off ? (
            <p className="mt-2 text-xs text-amber">O chat está pausado agora.</p>
          ) : me.logado ? (
            <form onSubmit={enviar} className="mt-2 grid gap-1.5">
              <div className="flex gap-2">
                <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} placeholder={`Falar como ${me.nick}`} className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-black/30 px-3 text-sm text-paper outline-none focus:border-lime" />
                <button type="submit" disabled={enviando || !texto.trim()} className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold text-ink disabled:opacity-40">
                  Enviar
                </button>
              </div>
              <button type="button" onClick={() => void sair()} className="justify-self-start text-[11px] text-mute underline">
                Sair do chat
              </button>
            </form>
          ) : (
            <div className="mt-2 grid gap-2">
              <input value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={16} placeholder="Escolha seu apelido (3 a 16 letras)" className="h-10 rounded-xl border border-line bg-black/30 px-3 text-sm text-paper outline-none focus:border-lime" />
              <div ref={btn} className="min-h-[44px]" />
              <p className="text-[11px] leading-snug text-mute">O Google só confirma que você é uma pessoa. Não guardamos seu e-mail nem seu nome.</p>
            </div>
          )}
          {erro ? <p className="mt-1.5 text-xs text-amber">{erro}</p> : null}
          <p className="mt-2 text-[11px] leading-snug text-mute">Respeite todo mundo. Palavrões, ofensas, links e spam são apagados e a conta é bloqueada. Mensagens moderadas. Conversa entre usuários, sem relação com o TSE.</p>
        </div>
      ) : null}
    </section>
  );
}
