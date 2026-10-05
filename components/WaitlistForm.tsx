"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CONSENT_TEXT } from "@/lib/env";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; msg: string }
  | { kind: "already" };

export const LS_REF = "apuracao:ref";
const SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, o: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function WaitlistForm() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [phone, setPhone] = useState("");
  const [incomingRef, setIncomingRef] = useState<string | null>(null);
  const [utm, setUtm] = useState<string | null>(null);
  const cfToken = useRef<string>("");
  const cfBox = useRef<HTMLDivElement>(null);
  const cfId = useRef<string | undefined>(undefined);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setIncomingRef(q.get("ref"));
    setUtm(q.get("utm_source") ?? q.get("src"));
    try {
      if (localStorage.getItem(LS_REF)) setState({ kind: "already" });
    } catch {
      /* storage indisponível */
    }
  }, []);

  // Turnstile (opcional): carrega o script só se houver sitekey
  useEffect(() => {
    if (!SITEKEY) return;
    const mount = () => {
      if (cfBox.current && window.turnstile && !cfId.current) {
        cfId.current = window.turnstile.render(cfBox.current, {
          sitekey: SITEKEY,
          appearance: "interaction-only",
          callback: (t: string) => (cfToken.current = t),
          "expired-callback": () => (cfToken.current = ""),
        });
      }
    };
    if (window.turnstile) return mount();
    const sc = document.createElement("script");
    sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    sc.async = true;
    sc.onload = mount;
    document.head.appendChild(sc);
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
          cfToken: cfToken.current,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; refCode?: string | null };
      if (!json.ok) {
        window.turnstile?.reset(cfId.current);
        cfToken.current = "";
        setState({ kind: "error", msg: json.error ?? "Erro inesperado." });
        return;
      }
      try {
        localStorage.setItem(LS_REF, json.refCode ?? "-");
      } catch {
        /* ignore */
      }
      // Leva a pessoa para ver o site funcionando (evita sensação de golpe)
      router.push("/apuracao?novo=1");
    } catch {
      setState({ kind: "error", msg: "Sem conexão. Tente de novo." });
    }
  }

  if (state.kind === "already") {
    return (
      <div className="rounded-2xl border border-lime/40 bg-panel p-5 sm:p-6">
        <p className="font-display text-2xl">Você já está na lista.</p>
        <p className="mt-1 text-sm text-mute">Avisamos no dia 25. Quer ver como a apuração vai funcionar?</p>
        <a
          href="/apuracao"
          className="mt-4 inline-flex h-12 items-center justify-center rounded-xl bg-lime px-5 font-semibold text-ink"
        >
          Ver a apuração
        </a>
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
        <div ref={cfBox} />
        <button
          type="submit"
          disabled={loading}
          className="min-h-[52px] rounded-xl bg-lime px-5 text-base font-semibold text-ink transition active:scale-[.99] disabled:opacity-60"
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
