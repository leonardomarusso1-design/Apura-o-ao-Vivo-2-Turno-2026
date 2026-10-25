"use client";

import { useEffect, useState } from "react";

type Msg = { id: string; t: number; uid: string; u: string; m: string };

/** Moderação: apagar mensagem, banir quem escreveu (apaga tudo dele), pausar o chat. A senha fica só na memória desta aba. */
export default function PainelChat() {
  const [senha, setSenha] = useState("");
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [off, setOff] = useState(false);
  const [aviso, setAviso] = useState("");

  const h = (s = senha) => ({ Authorization: `Bearer ${s}`, "Content-Type": "application/json" });

  const carregar = async (s = senha) => {
    try {
      const r = await fetch("/api/admin/chat", { headers: h(s), cache: "no-store" });
      if (r.ok) {
        const j = (await r.json()) as { off: boolean; msgs: Msg[] };
        setMsgs(j.msgs);
        setOff(j.off);
        setAviso("");
      } else setAviso(r.status === 401 ? "Senha errada." : "Erro ao carregar.");
    } catch {
      setAviso("Sem conexão.");
    }
  };

  const agir = async (corpo: Record<string, string>) => {
    await fetch("/api/admin/chat", { method: "POST", headers: h(), body: JSON.stringify(corpo) });
    void carregar();
  };

  useEffect(() => {
    if (!msgs) return;
    const id = setInterval(() => void carregar(), 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs !== null, senha]);

  const hora = (t: number) => new Date(t).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const btn = "h-8 rounded-lg border border-line px-3 text-xs hover:bg-white/5";

  return (
    <main className="mx-auto grid max-w-3xl gap-4 p-4 pb-16 sm:p-8">
      <h1 className="font-display text-2xl">Moderação do chat</h1>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void carregar();
        }}
      >
        <input type="password" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha (a ADMIN_SECRET da Vercel)" className="h-11 w-full max-w-sm rounded-xl border border-line bg-black/30 px-3 text-paper outline-none focus:border-lime" />
        <button type="submit" disabled={senha.length < 8} className="h-11 rounded-xl bg-lime px-5 font-semibold text-ink disabled:opacity-40">
          {msgs ? "Atualizar" : "Entrar"}
        </button>
      </form>
      {aviso ? <p className="text-sm text-amber">{aviso}</p> : null}

      {msgs ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-semibold ${off ? "text-amber" : "text-lime"}`}>{off ? "Chat PAUSADO" : "Chat no ar"}</span>
            <button className={btn} onClick={() => void agir({ acao: off ? "ligar" : "desligar" })}>
              {off ? "Religar o chat" : "Pausar o chat"}
            </button>
            <button className={btn} onClick={() => confirm("Apagar TODAS as mensagens?") && void agir({ acao: "limpar" })}>
              Apagar tudo
            </button>
          </div>
          <ul className="grid gap-1.5">
            {msgs.length === 0 ? <li className="text-sm text-mute">Sem mensagens.</li> : null}
            {msgs.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-sm">
                <span className="text-xs text-mute">{hora(m.t)}</span>
                <strong className="text-lime">{m.u}</strong>
                <span className="min-w-0 flex-1 break-words">{m.m}</span>
                <button className={btn} onClick={() => void agir({ acao: "apagar", id: m.id })}>
                  Apagar
                </button>
                <button className={`${btn} text-amber`} onClick={() => confirm(`Banir ${m.u}?`) && void agir({ acao: "banir", uid: m.uid })}>
                  Banir
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </main>
  );
}
