"use client";

import { useEffect, useState } from "react";
import { brlInt, type SlotAd, type SlotPend } from "@/lib/slot";

/** Espaço do mapa: veja os pedidos, confira o Pix no banco e aprove. A senha fica só na memória desta aba. */
export default function PainelSlot() {
  const [senha, setSenha] = useState("");
  const [dados, setDados] = useState<{ atual: SlotAd | null; preco: number; pend: SlotPend[] } | null>(null);
  const [aviso, setAviso] = useState("");
  const [novoPreco, setNovoPreco] = useState("");

  const h = (s = senha) => ({ Authorization: `Bearer ${s}`, "Content-Type": "application/json" });

  const carregar = async (s = senha) => {
    try {
      const r = await fetch("/api/admin/slot", { headers: h(s), cache: "no-store" });
      if (r.ok) {
        setDados((await r.json()) as { atual: SlotAd | null; preco: number; pend: SlotPend[] });
        setAviso("");
      } else setAviso(r.status === 401 ? "Senha errada." : "Erro ao carregar.");
    } catch {
      setAviso("Sem conexão.");
    }
  };

  const agir = async (corpo: Record<string, string | number>) => {
    await fetch("/api/admin/slot", { method: "POST", headers: h(), body: JSON.stringify(corpo) });
    void carregar();
  };

  useEffect(() => {
    if (!dados) return;
    const id = setInterval(() => void carregar(), 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados !== null, senha]);

  const hora = (t: number) => new Date(t).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const btn = "h-8 rounded-lg border border-line px-3 text-xs hover:bg-white/5";

  return (
    <main className="mx-auto grid max-w-3xl gap-4 p-4 pb-16 sm:p-8">
      <h1 className="font-display text-2xl">Espaço do mapa</h1>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void carregar();
        }}
      >
        <input type="password" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha (a ADMIN_SECRET da Vercel)" className="h-11 w-full max-w-sm rounded-xl border border-line bg-black/30 px-3 text-paper outline-none focus:border-lime" />
        <button type="submit" disabled={senha.length < 8} className="h-11 rounded-xl bg-lime px-5 font-semibold text-ink disabled:opacity-40">
          {dados ? "Atualizar" : "Entrar"}
        </button>
      </form>
      {aviso ? <p className="text-sm text-amber">{aviso}</p> : null}

      {dados ? (
        <>
          <section className="rounded-2xl border border-line bg-panel p-4">
            <p className="text-xs uppercase tracking-widest text-mute">No ar agora</p>
            {dados.atual ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-xl">{dados.atual.marca}</p>
                  <p className="text-sm text-mute">{dados.atual.frase}</p>
                  <a href={dados.atual.site} target="_blank" rel="noopener noreferrer" className="break-all text-xs underline">{dados.atual.site}</a>
                  <p className="mt-1 text-xs text-mute">Pagou {brlInt(dados.atual.pago)}</p>
                </div>
                <button onClick={() => void agir({ acao: "limpar" })} className={btn}>Tirar do ar</button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-mute">Vazio.</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3 text-sm">
              <span>Preço para tomar o espaço agora: <strong>{brlInt(dados.preco)}</strong></span>
              <input value={novoPreco} onChange={(e) => setNovoPreco(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="novo preço" className="h-8 w-28 rounded-lg border border-line bg-black/30 px-2 text-xs outline-none focus:border-lime" />
              <button disabled={!novoPreco} onClick={() => { void agir({ acao: "preco", valor: Number(novoPreco) }); setNovoPreco(""); }} className={`${btn} disabled:opacity-40`}>Mudar</button>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-panel p-4">
            <p className="text-xs uppercase tracking-widest text-mute">Pedidos ({dados.pend.length})</p>
            <p className="mt-1 text-xs text-mute">Só aprove depois de ver o Pix do valor no seu banco. Aprovar põe no ar e dobra o preço.</p>
            {dados.pend.length === 0 ? <p className="mt-3 text-sm text-mute">Nenhum pedido.</p> : null}
            <ul className="mt-3 grid gap-3">
              {dados.pend.map((p) => (
                <li key={p.id} className={`rounded-xl border p-3 ${p.pagou ? "border-lime/60" : "border-line"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-lg">{p.marca}</p>
                      <p className="text-sm text-mute">{p.frase}</p>
                      <a href={p.site} target="_blank" rel="noopener noreferrer" className="break-all text-xs underline">{p.site}</a>
                      <p className="mt-1 text-xs">Contato: <strong>{p.contato}</strong></p>
                    </div>
                    <div className="text-right text-xs text-mute">
                      <p className="text-sm font-semibold text-paper">{brlInt(p.preco)}</p>
                      <p>{hora(p.t)}</p>
                      <p className={p.pagou ? "font-semibold text-lime" : ""}>{p.pagou ? "disse que pagou" : "ainda não marcou pago"}</p>
                      {p.preco < dados.preco ? <p className="text-amber">preço defasado (agora {brlInt(dados.preco)})</p> : null}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => void agir({ acao: "aprovar", id: p.id })} className={`${btn} !border-lime/60 text-lime`}>Aprovar</button>
                    <button onClick={() => void agir({ acao: "recusar", id: p.id })} className={btn}>Recusar</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}
