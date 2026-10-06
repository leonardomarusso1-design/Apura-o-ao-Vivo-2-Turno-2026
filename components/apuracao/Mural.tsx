"use client";

import { useEffect, useState } from "react";

const REACOES = [
  { k: "aplauso", e: "👏", n: "Aplauso" },
  { k: "uau", e: "😮", n: "Uau" },
  { k: "triste", e: "😢", n: "Triste" },
  { k: "fogo", e: "🔥", n: "Pegando fogo" },
] as const;
const FAIXAS = [
  { k: "f1", n: "Até 18h30" },
  { k: "f2", n: "18h30 – 19h" },
  { k: "f3", n: "19h – 19h30" },
  { k: "f4", n: "19h30 – 20h" },
  { k: "f5", n: "20h – 21h" },
  { k: "f6", n: "Depois das 21h" },
] as const;
const LS = "apuracao:mural:palpite";
type Est = { reacoes: Record<string, number>; palpites: Record<string, number> };

const fmt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

/** Reações em emoji + palpite sobre o horário em que a apuração chega a 90% (sem texto livre, sem candidato). */
export default function Mural({ pct }: { pct: number }) {
  const [e, setE] = useState<Est | null>(null);
  const [meu, setMeu] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    try {
      setMeu(localStorage.getItem(LS));
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

  const enviar = async (tipo: "reacao" | "palpite", k: string) => {
    setErro("");
    if (tipo === "reacao") setE((x) => (x ? { ...x, reacoes: { ...x.reacoes, [k]: (x.reacoes[k] ?? 0) + 1 } } : x));
    try {
      const r = await fetch("/api/mural", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, k }) });
      const j = (await r.json()) as Est & { ok: boolean; erro?: string };
      if (j.reacoes) setE({ reacoes: j.reacoes, palpites: j.palpites });
      if (tipo === "palpite" && (j.ok || j.erro === "ja-votou")) {
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
  const encerrado = pct >= 90;
  return (
    <div className="h-72 space-y-4 overflow-y-auto overscroll-contain pr-1 text-xs xl:h-[25rem]">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-mute">Como você está se sentindo?</p>
        <div className="grid grid-cols-4 gap-2">
          {REACOES.map((r) => (
            <button
              key={r.k}
              type="button"
              onClick={() => void enviar("reacao", r.k)}
              aria-label={`${r.n}: ${fmt(e?.reacoes[r.k] ?? 0)}`}
              className="clicavel flex flex-col items-center gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 active:scale-95"
            >
              <span className="text-xl">{r.e}</span>
              <span className="tabular text-[11px] font-semibold text-paper">{fmt(e?.reacoes[r.k] ?? 0)}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-mute">Palpite do dia</p>
        <p className="mb-2 text-sm font-semibold leading-snug text-paper">A que horas a apuração chega a 90% das seções?</p>
        <ul className="grid gap-1.5">
          {FAIXAS.map((f) => {
            const n = e?.palpites[f.k] ?? 0;
            const p = total ? (n / total) * 100 : 0;
            const mostra = meu !== null || encerrado;
            return (
              <li key={f.k}>
                {mostra ? (
                  <div className={`relative overflow-hidden rounded-lg border px-2.5 py-1.5 ${meu === f.k ? "border-lime/70" : "border-white/[0.06]"}`}>
                    <span className="absolute inset-y-0 left-0 bg-white/10" style={{ width: `${p}%` }} aria-hidden />
                    <span className="relative flex justify-between">
                      <span>
                        {f.n} {meu === f.k ? "✓" : ""}
                      </span>
                      <strong className="tabular">{Math.round(p)}%</strong>
                    </span>
                  </div>
                ) : (
                  <button type="button" onClick={() => void enviar("palpite", f.k)} className="clicavel w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-left">
                    {f.n}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[10px] leading-snug text-mute">
          {fmt(total)} {total === 1 ? "palpite" : "palpites"} · um por pessoa. {encerrado ? "Palpites encerrados." : meu ? "Seu palpite foi registrado." : "Vote para ver o resultado."}
        </p>
        <p className="mt-1 text-[10px] leading-snug text-mute">Brincadeira sobre o ritmo da apuração. Não é pesquisa nem enquete eleitoral.</p>
      </div>
      {erro ? <p className="text-[11px] text-amber">{erro}</p> : null}
    </div>
  );
}
