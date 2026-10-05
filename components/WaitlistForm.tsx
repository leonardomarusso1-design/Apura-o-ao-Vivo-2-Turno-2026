"use client";

import { useEffect, useState } from "react";
import { CONSENT_TEXT, SITE_URL } from "@/lib/env";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; msg: string }
  | { kind: "done"; refCode: string | null };

const LS_KEY = "apuracao:ref";

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function WaitlistForm() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [phone, setPhone] = useState("");
  const [incomingRef, setIncomingRef] = useState<string | null>(null);
  const [utm, setUtm] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setIncomingRef(q.get("ref"));
    setUtm(q.get("utm_source") ?? q.get("src"));
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setState({ kind: "done", refCode: saved === "-" ? null : saved });
    } catch {
      /* storage indisponível */
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          phone,
          consent: f.get("consent") === "on",
          website: f.get("website"),
          ref: incomingRef,
          utm,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; refCode?: string | null };
      if (!json.ok) {
        setState({ kind: "error", msg: json.error ?? "Erro inesperado." });
        return;
      }
      const code = json.refCode ?? null;
      try {
        localStorage.setItem(LS_KEY, code ?? "-");
      } catch {
        /* ignore */
      }
      setState({ kind: "done", refCode: code });
    } catch {
      setState({ kind: "error", msg: "Sem conexão. Tente de novo." });
    }
  }

  if (state.kind === "done") {
    const link = state.refCode ? `${SITE_URL}/?ref=${state.refCode}` : SITE_URL;
    const text = `Vou acompanhar a apuração do 2º turno em tempo real aqui. Entra na lista pra ser avisado: ${link}`;
    return (
      <div className="rounded-2xl border border-lime/40 bg-panel p-5 sm:p-6">
        <p className="font-display text-2xl">Você está na lista.</p>
        <p className="mt-1 text-sm text-mute">
          Avisamos no dia 25, quando a apuração começar. Quanto mais gente, mais rápido todo mundo fica sabendo.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-lime px-5 font-semibold text-ink"
          >
            Chamar amigos no WhatsApp
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(link)}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-line px-5 text-sm"
          >
            Copiar meu link
          </button>
        </div>
      </div>
    );
  }

  const loading = state.kind === "loading";
  const input =
    "h-12 w-full rounded-xl border border-line bg-ink px-4 text-base outline-none placeholder:text-mute/70 focus:border-lime";

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-panel p-5 sm:p-6" noValidate>
      <div className="grid gap-3">
        <input name="name" type="text" autoComplete="given-name" placeholder="Seu nome (opcional)" className={input} maxLength={80} />
        <input name="email" type="email" required autoComplete="email" inputMode="email" placeholder="Seu melhor e-mail" className={input} />
        <input
          name="phone"
          type="tel"
          autoComplete="tel-national"
          inputMode="numeric"
          placeholder="WhatsApp com DDD (opcional)"
          value={phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
          className={input}
        />
        {/* honeypot */}
        <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
        <label className="flex items-start gap-3 text-xs leading-snug text-mute">
          <input name="consent" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#c6f24e]" />
          <span>
            {CONSENT_TEXT}{" "}
            <a href="/privacidade" className="underline">
              Privacidade
            </a>
            .
          </span>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="h-13 min-h-[52px] rounded-xl bg-lime px-5 text-base font-semibold text-ink transition active:scale-[.99] disabled:opacity-60"
        >
          {loading ? "Enviando…" : "Quero ser avisado"}
        </button>
        <p role="alert" className="min-h-5 text-sm text-amber">
          {state.kind === "error" ? state.msg : ""}
        </p>
      </div>
    </form>
  );
}
