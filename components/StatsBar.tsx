"use client";

import { useEffect, useState } from "react";

type Stats = { waiting: number | null; online: number | null };

const fmt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const load = async () => {
      if (document.hidden) return schedule();
      try {
        const r = await fetch("/api/stats");
        if (r.ok && alive) setStats((await r.json()) as Stats);
      } catch {
        /* mantém último valor */
      }
      schedule();
    };
    const schedule = () => {
      if (alive) timer = setTimeout(load, 20_000);
    };

    void load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="border-b border-white/[0.06] bg-[#07090e]/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="mx-auto flex h-10 w-full max-w-[1800px] items-center justify-between gap-4 px-4 text-xs lg:px-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="truncate text-mute font-medium">
            {stats?.waiting != null ? (
              <>
                <strong className="tabular font-semibold text-paper">{fmt(stats.waiting)}</strong>{" "}
                eleitores cadastrados para o 2º turno
              </>
            ) : (
              <span>Conectado à apuração oficial</span>
            )}
          </span>
        </div>
        {stats?.online ? (
          <div className="shrink-0 text-mute flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            <span><strong className="tabular font-semibold text-paper">{fmt(stats.online)}</strong> acompanhando ao vivo</span>
          </div>
        ) : (
          <div className="text-[11px] text-mute font-medium uppercase tracking-wider hidden sm:block">
            Dados Diretos do TSE
          </div>
        )}
      </div>
    </div>
  );
}
