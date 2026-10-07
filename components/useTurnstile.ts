"use client";

import { useEffect, useRef } from "react";

const SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY;

type Api = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void };

/** Turnstile invisível (só aparece se o Cloudflare desconfiar). Sem sitekey, não faz nada. */
export function useTurnstile() {
  const token = useRef("");
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!SITEKEY) return;
    const w = window as unknown as { turnstile?: Api };
    const mount = () => {
      if (box.current && w.turnstile && !id.current) {
        id.current = w.turnstile.render(box.current, {
          sitekey: SITEKEY,
          appearance: "interaction-only",
          callback: (t: string) => (token.current = t),
          "expired-callback": () => (token.current = ""),
        });
      }
    };
    if (w.turnstile) return mount();
    const existente = document.querySelector<HTMLScriptElement>('script[src^="https://challenges.cloudflare.com/turnstile"]');
    if (existente) {
      existente.addEventListener("load", mount);
      return () => existente.removeEventListener("load", mount);
    }
    const sc = document.createElement("script");
    sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    sc.async = true;
    sc.onload = mount;
    document.head.appendChild(sc);
  }, []);
  const reset = () => {
    (window as unknown as { turnstile?: Api }).turnstile?.reset(id.current);
    token.current = "";
  };
  return { token, box, reset };
}
