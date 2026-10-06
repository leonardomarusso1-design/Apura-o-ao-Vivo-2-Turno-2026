"use client";

import { useEffect, useRef, useState } from "react";
import type { Cand } from "@/lib/apuracao/types";
import Avatar from "./Avatar";

/** Seletor de candidato com foto (substitui o <select> nativo). */
export default function SeletorCandidato({
  cands,
  valor,
  cor,
  onChange,
}: {
  cands: Cand[];
  valor: number | null;
  cor: (n: number | undefined) => string;
  onChange: (n: number | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const f = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    const k = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", f);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("pointerdown", f);
      document.removeEventListener("keydown", k);
    };
  }, [aberto]);
  const sel = valor != null ? cands.find((c) => c.n === valor) : undefined;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        className={`flex h-8 items-center gap-1.5 rounded-lg pl-1 pr-2 ${sel ? "bg-white/10 text-paper ring-1 ring-white/25" : "px-2 text-mute hover:text-paper"}`}
      >
        {sel ? <Avatar n={sel.n} sq={sel.sq} nome={sel.nome} cor={cor(sel.n)} size={24} /> : null}
        <span className="max-w-[120px] truncate">{sel ? sel.nome : "Candidato"}</span>
        <span aria-hidden className="text-[9px] text-mute">▾</span>
      </button>
      {aberto ? (
        <ul role="listbox" className="glass-panel-elevated absolute left-0 top-9 z-40 max-h-[60vh] w-[260px] overflow-y-auto rounded-xl border border-white/10 p-1 shadow-2xl">
          {cands.map((c) => (
            <li key={c.sq} role="option" aria-selected={c.n === valor}>
              <button
                type="button"
                onClick={() => {
                  onChange(c.n);
                  setAberto(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-white/10"
              >
                <Avatar n={c.n} sq={c.sq} nome={c.nome} cor={cor(c.n)} size={32} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-xs font-semibold text-paper">{c.nome}</span>
                  <span className="text-[11px]" style={{ color: cor(c.n) }}>
                    {c.partido} · {c.n}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
