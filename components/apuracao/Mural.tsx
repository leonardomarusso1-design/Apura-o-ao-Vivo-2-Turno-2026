"use client";

import { useEffect, useState } from "react";

const REACOES = [
  { k: "verde", e: "💚", n: "Coração verde" },
  { k: "vermelho", e: "❤️", n: "Coração vermelho" },
] as const;
const FAIXAS = [
  { k: "tv", e: "📺", n: "TV" },
  { k: "cel", e: "📱", n: "Celular" },
  { k: "pc", e: "💻", n: "Computador" },
] as const;
const LS = "apuracao:mural:onde";
const LS_R = "apuracao:mural:coracao";
const LS_ID = "apuracao:mural:id";

function meuId(): string {
  try {
    let id = localStorage.getItem(LS_ID);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`).replace(/[^a-z0-9-]/gi, "").slice(0, 40).toLowerCase();
      localStorage.setItem(LS_ID, id);
    }
    return id;
  } catch {
    return "";
  }
}
type Est = { reacoes: Record<string, number>; palpites: Record<string, number> };

const fmt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

/** Dois corações (o site só mostra o total, nunca por cor) + "onde você assiste". Sem texto livre, sem pergunta sobre candidato. */
export default function Mural({ pct: _pct }: { pct: number }) {
  const [e, setE] = useState<Est | null>(null);
  const [meu, setMeu] = useState<string | null>(null);
  const [minha, setMinha] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    try {
      setMeu(localStorage.getItem(LS));
      setMinha(localStorage.getItem(LS_R));
    } catch {
      /* ignore */
    }
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        if (!document.hidden) {
          const r = await fetch("/api/mural");
          if (r.ok && alive) setE((await r.json()) as Est);
        }
      } catch {
        /* mantém */
      }
      if (alive) t = setTimeout(load, 10_000);
    };
    void load();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  // Reação: uma por pessoa. Clicar em outra troca; clicar na mesma tira.
  const reagir = async (k: string) => {
    setErro("");
    const antes = minha;
    const depois = antes === k ? null : k;
    setMinha(depois);
    setE((x) => {
      if (!x) return x;
      const total = Math.max(0, (x.reacoes.total ?? 0) + (depois ? 1 : 0) - (antes ? 1 : 0));
      return { ...x, reacoes: { total } };
    });
    try {
      if (depois) localStorage.setItem(LS_R, depois);
      else localStorage.removeItem(LS_R);
    } catch {
      /* ignore */
    }
    try {
      const r = await fetch("/api/mural", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "reacao", k: depois ?? k, cid: meuId() }) });
      const j = (await r.json()) as Est & { ok: boolean; erro?: string };
      if (j.reacoes) setE({ reacoes: j.reacoes, palpites: j.palpites });
      if (j.erro === "devagar") setErro("Calma, muitos cliques seguidos.");
    } catch {
      setErro("Sem conexão. Tente de novo.");
    }
  };

  const enviar = async (tipo: "palpite", k: string) => {
    setErro("");
    try {
      const r = await fetch("/api/mural", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, k, cid: meuId() }) });
      const j = (await r.json()) as Est & { ok: boolean; erro?: string };
      if (j.reacoes) setE({ reacoes: j.reacoes, palpites: j.palpites });
      if (j.ok || j.erro === "ja-votou") {
        setMeu(k);
        try {
          localStorage.setItem(LS, k);
        } catch {
          /* ignore */
        }
      }
      if (j.erro === "devagar") setErro("Calma, muitos cliques seguidos.");
    } catch {
      setErro("Sem conexão. Tente de novo.");
    }
  };

  const total = e ? Object.values(e.palpites).reduce((a, b) => a + b, 0) : 0;
  return (
    <div className="h-72 space-y-3 overflow-y-auto overscroll-contain pr-1 text-xs lg:h-auto lg:min-h-0 lg:flex-1">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-mute">O seu coração está?</p>
        <div className="grid grid-cols-2 gap-2">
          {REACOES.map((r) => (
            <button
              key={r.k}
              type="button"
              onClick={() => void reagir(r.k)}
              aria-pressed={minha === r.k}
              aria-label={r.n}
              className={`clicavel flex items-center justify-center rounded-xl border py-2.5 active:scale-95 ${minha === r.k ? "border-lime/70 bg-white/10" : "border-white/[0.06] bg-white/[0.03]"}`}
            >
              <span className="text-3xl leading-none">{r.e}</span>
            </button>
          ))}
        </div>
        <p className="tabular mt-2 text-[11px] text-mute">
          <strong className="text-paper">{fmt(e?.reacoes.total ?? 0)}</strong> {(e?.reacoes.total ?? 0) === 1 ? "coração" : "corações"} · um por pessoa. O site soma os dois e não mostra o resultado por cor.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold leading-snug text-paper">Está assistindo por onde? TV, celular ou computador?</p>
        <ul className="grid gap-1.5">
          {FAIXAS.map((f) => {
            const n = e?.palpites[f.k] ?? 0;
            const p = total ? (n / total) * 100 : 0;
            const mostra = meu !== null;
            return (
              <li key={f.k}>
                {mostra ? (
                  <div className={`relative overflow-hidden rounded-lg border px-2.5 py-1.5 ${meu === f.k ? "border-lime/70" : "border-white/[0.06]"}`}>
                    <span className="absolute inset-y-0 left-0 bg-white/10" style={{ width: `${p}%` }} aria-hidden />
                    <span className="relative flex justify-between">
                      <span>
                        {f.e} {f.n} {meu === f.k ? "✓" : ""}
                      </span>
                      <strong className="tabular">{Math.round(p)}%</strong>
                    </span>
                  </div>
                ) : (
                  <button type="button" onClick={() => void enviar("palpite", f.k)} className="clicavel w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-left">
                    {f.e} {f.n}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[10px] leading-snug text-mute">
          {fmt(total)} {total === 1 ? "resposta" : "respostas"} · uma por pessoa. {meu ? "Obrigado!" : "Responda para ver o resultado."}
        </p>
        <p className="mt-1 text-[10px] leading-snug text-mute">Só curiosidade sobre onde você assiste. Não é pesquisa nem enquete eleitoral.</p>
      </div>
      {erro ? <p className="text-[11px] text-amber">{erro}</p> : null}
    </div>
  );
}
