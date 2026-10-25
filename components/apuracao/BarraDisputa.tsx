"use client";

import { useEffect, useState } from "react";
import type { Area } from "@/lib/apuracao/types";
import Avatar from "./Avatar";
import { fmtPct } from "./types";

/** Início da apuração: urnas fecham às 17h de Brasília do dia 25. */
const INICIO = new Date("2026-10-25T17:00:00-03:00").getTime();
const hms = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const milhoes = (n: number) => `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n / 1e6)} milhões`;

/** Cabo de guerra: um candidato de cada lado, barra que cresce de cada ponta e marcador de 50%. */
export default function BarraDisputa({ br, cor, turno }: { br: Area | null; cor: (n: number | undefined) => string; turno: 1 | 2 }) {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const dois = [...(br?.cands ?? [])].slice(0, 2).sort((a, b) => a.n - b.n);
  if (dois.length < 2) return null;
  const [e, d] = dois;
  const semVotos = !br || br.pctApurado <= 0 || e.votos + d.votos === 0;
  const contagem = turno === 2 && semVotos && agora !== null && agora < INICIO;
  const falta = br ? Math.max(0, br.eleitores - br.eleitoresApurados) : 0;
  const pe = semVotos ? 0 : e.pct;
  const pd = semVotos ? 0 : d.pct;
  const lider = semVotos ? null : e.votos === d.votos ? null : e.votos > d.votos ? e : d;

  const lado = (c: typeof e, dir: "l" | "r") => (
    <div className={`flex min-w-0 items-center gap-2.5 ${dir === "r" ? "flex-row-reverse text-right" : ""}`}>
      <Avatar n={c.n} sq={c.sq} nome={c.nome} cor={cor(c.n)} size={40} eager />
      <div className="min-w-0">
        <p className="truncate font-display text-base leading-tight sm:text-lg">{c.nome.split(" ").slice(0, 2).join(" ")}</p>
        <p className="text-xs text-mute">
          {c.partido} · {c.n}
          {!semVotos ? <strong className="ml-2 text-sm text-paper">{fmtPct(c.pct, 2)}%</strong> : null}
        </p>
      </div>
    </div>
  );

  return (
    <section className="glass-panel rounded-xl px-3 py-2" aria-label="Disputa pela presidência">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {lado(e, "l")}
        <p className="hidden text-center font-display text-sm sm:block sm:text-base" aria-live="polite">
          {contagem ? (
            <>A apuração começa em <span className="tabular">{hms(INICIO - (agora ?? INICIO))}</span></>
          ) : semVotos ? (
            "Aguardando os primeiros votos"
          ) : lider ? (
            <>{lider.nome.split(" ")[0]} na frente por <span className="tabular">{new Intl.NumberFormat("pt-BR").format(Math.abs(e.votos - d.votos))}</span> votos</>
          ) : (
            "Empate"
          )}
        </p>
        <span className="sm:hidden" />
        {lado(d, "r")}
      </div>

      {contagem ? (
        <p className="mt-2 text-center font-display text-base sm:hidden">
          Apuração em <span className="tabular">{hms(INICIO - (agora ?? INICIO))}</span>
        </p>
      ) : null}

      <div className="relative mt-5">
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-md border border-white/20 bg-ink px-1.5 text-[10px] font-semibold leading-4 text-paper">50%</span>
        <div className="relative h-3 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${e.nome} ${fmtPct(pe)}%, ${d.nome} ${fmtPct(pd)}%`}>
          <div className="absolute inset-y-0 left-0 rounded-l-full transition-[width] duration-700" style={{ width: `${pe}%`, background: cor(e.n) }} />
          <div className="absolute inset-y-0 right-0 rounded-r-full transition-[width] duration-700" style={{ width: `${pd}%`, background: cor(d.n) }} />
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/80" />
        </div>
      </div>

      <p className="mt-1.5 text-[11px] text-mute">
        <strong className="text-paper">{fmtPct(br?.pctApurado ?? 0, br && br.pctApurado >= 10 ? 1 : 2).replace(/,00$/, "")}%</strong> apurado
        {falta > 0 ? <> · faltam {milhoes(falta)} de eleitores a apurar</> : null}
      </p>
    </section>
  );
}
