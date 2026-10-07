"use client";

import { useEffect, useState } from "react";
import { brl, type Lance } from "@/lib/leilao";

type Resp = { ok: boolean; encerra: string; cotas: number; lances: Lance[] };

/** Painel só seu: lances do maior para o menor, com WhatsApp e e-mail. A senha fica só na memória desta aba. */
export default function PainelLeilao() {
  const [senha, setSenha] = useState("");
  const [dados, setDados] = useState<Resp | null>(null);
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);

  const carregar = async (s = senha) => {
    setCarregando(true);
    try {
      const r = await fetch("/api/admin/leilao", { headers: { Authorization: `Bearer ${s}` }, cache: "no-store" });
      if (r.ok) {
        setDados((await r.json()) as Resp);
        setMsg("");
      } else if (r.status === 401) setMsg("Senha errada.");
      else if (r.status === 429) setMsg("Muitas tentativas. Espere 1 minuto.");
      else setMsg("O Redis não respondeu. Tente de novo.");
    } catch {
      setMsg("Sem conexão.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (!dados) return;
    const id = setInterval(() => void carregar(), 20_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, senha]);

  const campo = "h-11 w-full rounded-xl border border-line bg-black/30 px-3 text-paper outline-none focus:border-lime";
  const hora = (t: number) => new Date(t).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return (
    <main className="mx-auto grid max-w-4xl gap-5 p-4 pb-16 sm:p-8">
      <h1 className="font-display text-2xl">Leilão de patrocínio</h1>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void carregar();
        }}
      >
        <input type="password" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha (a ADMIN_SECRET da Vercel)" className={`${campo} max-w-sm`} />
        <button type="submit" disabled={carregando || senha.length < 8} className="h-11 rounded-xl bg-lime px-5 font-semibold text-ink disabled:opacity-40">
          {carregando ? "Carregando..." : dados ? "Atualizar" : "Ver lances"}
        </button>
      </form>
      {msg ? <p className="text-sm text-amber">{msg}</p> : null}

      {dados ? (
        <>
          <p className="text-sm text-mute">
            Encerra em {hora(Date.parse(dados.encerra))} · {dados.cotas} cotas · {dados.lances.length} lance(s). Atualiza sozinho a cada 20 s. As linhas em destaque são as cotas
            vencedoras no momento.
          </p>
          {dados.lances.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-6 text-center text-mute">Nenhum lance ainda.</p>
          ) : (
            <ol className="grid gap-3">
              {dados.lances.map((l, i) => {
                const vence = i < dados.cotas;
                const tel = l.whatsapp.replace(/\D/g, "");
                return (
                  <li key={l.id} className={`grid gap-1 rounded-2xl border p-4 text-sm ${vence ? "border-lime/60 bg-panel" : "border-line"}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-display text-xl">
                        {i + 1}º · {brl(l.valor)}
                      </p>
                      <p className="text-xs text-mute">
                        {vence ? "VENCENDO · " : ""}
                        {hora(l.ts)}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {l.empresa} <span className="font-normal text-mute">· {l.nome}</span>
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        className="inline-flex h-10 items-center rounded-xl bg-lime px-3 font-semibold text-ink"
                        href={`https://wa.me/${tel}?text=${encodeURIComponent(`Olá, ${l.nome}! Aqui é do Apuração Ao Vivo 2026. Seu lance de ${brl(l.valor)} está entre os vencedores. Vamos combinar o pagamento e a arte?`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        WhatsApp {l.whatsapp.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3")}
                      </a>
                      <a className="inline-flex h-10 items-center rounded-xl border border-line px-3" href={`mailto:${l.email}`}>
                        {l.email}
                      </a>
                    </div>
                    {l.obs ? <p className="text-xs text-mute">Recado: {l.obs}</p> : null}
                  </li>
                );
              })}
            </ol>
          )}
        </>
      ) : null}
    </main>
  );
}
