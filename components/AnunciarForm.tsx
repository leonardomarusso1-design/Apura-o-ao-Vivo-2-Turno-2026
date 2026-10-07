"use client";

import { useEffect, useState } from "react";
import { useTurnstile } from "./useTurnstile";
import { brl } from "@/lib/leilao";

type Info = { encerra: string; aberto: boolean; cotas: number; minimo: number; lances: number; ok: boolean };
type Estado = { k: "idle" } | { k: "enviando" } | { k: "erro"; msg: string } | { k: "feito"; dentro: boolean; valor: number; minimo: number };

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function resta(ate: number, agora: number): string {
  let s = Math.max(0, Math.floor((ate - agora) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${d > 0 ? `${d}d ` : ""}${dois(h)}h ${dois(m)}min ${dois(s % 60)}s`;
}

export default function AnunciarForm({ inicial }: { inicial: { encerra: string; cotas: number; minimo: number } }) {
  const [info, setInfo] = useState<Info>({ ...inicial, aberto: true, lances: 0, ok: false });
  const [agora, setAgora] = useState<number | null>(null);
  const [est, setEst] = useState<Estado>({ k: "idle" });
  const [whats, setWhats] = useState("");
  const [valor, setValor] = useState("");
  const { token, box, reset } = useTurnstile();

  const carregar = async () => {
    try {
      const r = await fetch("/api/leilao", { cache: "no-store" });
      if (r.ok) setInfo((await r.json()) as Info);
    } catch {
      /* mantém o que já está */
    }
  };
  useEffect(() => {
    void carregar();
    const a = setInterval(() => void carregar(), 20_000);
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => {
      clearInterval(a);
      clearInterval(t);
    };
  }, []);

  const fim = Date.parse(info.encerra);
  const aberto = info.aberto && (agora === null || agora < fim);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = Math.floor(Number(valor.replace(/\D/g, "")));
    setEst({ k: "enviando" });
    try {
      const r = await fetch("/api/leilao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: f.get("empresa"),
          nome: f.get("nome"),
          email: f.get("email"),
          whatsapp: whats,
          valor: v,
          obs: f.get("obs"),
          aceite: f.get("aceite") === "on",
          website: f.get("website"),
          cfToken: token.current,
        }),
      });
      const j = (await r.json()) as { ok: boolean; error?: string; dentro?: boolean; minimo?: number };
      if (!j.ok) {
        reset();
        setEst({ k: "erro", msg: j.error ?? "Erro inesperado." });
        void carregar();
        return;
      }
      setEst({ k: "feito", dentro: Boolean(j.dentro), valor: v, minimo: j.minimo ?? info.minimo });
      void carregar();
    } catch {
      setEst({ k: "erro", msg: "Sem conexão. Tente de novo." });
    }
  }

  const campo = "h-12 w-full rounded-xl border border-line bg-black/30 px-3 text-paper outline-none focus:border-lime";

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-2xl border border-line bg-panel p-4 sm:grid-cols-3 sm:p-5">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-mute">{aberto ? "Lances encerram em" : "Lances"}</p>
          <p className="tabular font-display text-2xl">{aberto ? (agora === null ? "--" : resta(fim, agora)) : "Encerrados"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-mute">Cotas à venda</p>
          <p className="font-display text-2xl">{info.cotas}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-mute">Lance mínimo agora</p>
          <p className="tabular font-display text-2xl text-amber">{brl(info.minimo)}</p>
        </div>
      </div>

      {!aberto ? (
        <p className="rounded-2xl border border-line bg-panel p-5 text-sm text-mute">Os lances foram encerrados. Os vencedores serão contatados pelo WhatsApp e pelo e-mail informados.</p>
      ) : est.k === "feito" ? (
        <div className="rounded-2xl border border-lime/40 bg-panel p-5" role="status">
          <p className="font-display text-2xl">Lance de {brl(est.valor)} registrado ✓</p>
          <p className="mt-2 text-sm text-mute">
            {est.dentro
              ? "No momento, seu lance está entre os que ficam com uma cota."
              : `No momento, seu lance ainda não está entre os vencedores. Para entrar, ofereça pelo menos ${brl(est.minimo)}.`}{" "}
            Você pode aumentar o lance até o encerramento, usando o mesmo e-mail. Se vencer, entramos em contato pelo WhatsApp e pelo e-mail que você informou.
          </p>
          <button type="button" onClick={() => setEst({ k: "idle" })} className="mt-4 h-11 rounded-xl border border-line px-4 text-sm hover:bg-white/5">
            Aumentar meu lance
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} className="grid gap-3 rounded-2xl border border-line bg-panel p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="empresa" required maxLength={80} placeholder="Empresa ou marca" className={campo} autoComplete="organization" />
            <input name="nome" required maxLength={80} placeholder="Seu nome" className={campo} autoComplete="name" />
            <input name="email" type="email" required maxLength={254} placeholder="E-mail" className={campo} autoComplete="email" />
            <input
              name="whatsapp"
              inputMode="tel"
              required
              placeholder="WhatsApp com DDD"
              value={whats}
              onChange={(e) => setWhats(maskPhone(e.target.value))}
              className={campo}
              autoComplete="tel-national"
            />
          </div>
          <label className="grid gap-1.5 text-sm">
            <span className="text-mute">Seu lance (R$) · mínimo {brl(info.minimo)}</span>
            <input
              inputMode="numeric"
              required
              value={valor}
              onChange={(e) => setValor(e.target.value.replace(/\D/g, "").slice(0, 7))}
              placeholder={String(info.minimo)}
              className={`${campo} tabular text-lg`}
            />
          </label>
          <textarea name="obs" rows={2} maxLength={300} placeholder="Quer deixar algum recado? (opcional)" className="w-full rounded-xl border border-line bg-black/30 px-3 py-2 text-paper outline-none focus:border-lime" />
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
          <label className="flex items-start gap-2 text-xs leading-relaxed text-mute">
            <input name="aceite" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-lime" />
            <span>
              Entendo que o lance é um compromisso: se vencer, pago o valor combinado e envio a arte. Meu anúncio não é de candidato, partido, coligação nem de
              propaganda eleitoral. Autorizo o contato por WhatsApp e e-mail sobre este leilão (
              <a href="/privacidade" className="underline">
                privacidade
              </a>
              ).
            </span>
          </label>
          <div ref={box} />
          {est.k === "erro" ? (
            <p role="alert" className="text-sm text-amber">
              {est.msg}
            </p>
          ) : null}
          <button type="submit" disabled={est.k === "enviando"} className="h-12 rounded-xl bg-amber font-semibold text-ink disabled:opacity-50">
            {est.k === "enviando" ? "Enviando..." : "Dar meu lance"}
          </button>
        </form>
      )}
    </div>
  );
}
