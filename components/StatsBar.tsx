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

  // Altura fixa: evita layout shift enquanto carrega
  return (
    <div className="border-b border-line bg-panel/80 backdrop-blur">
      <div className="mx-auto flex h-11 max-w-5xl items-center justify-between gap-4 px-4 text-[13px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="pulse-dot h-2 w-2 shrink-0 rounded-full bg-lime" aria-hidden />
          <span className="truncate text-mute">
            {stats?.waiting != null ? (
              <>
                <strong className="tabular font-semibold text-paper">{fmt(stats.waiting)}</strong>{" "}
                {stats.waiting === 1 ? "pessoa aguardando" : "pessoas aguardando"} o 2º turno aqui
              </>
            ) : (
              <span className="inline-block h-3 w-44 rounded bg-line align-middle" />
            )}
          </span>
        </div>
        {stats?.online ? (
          <div className="shrink-0 text-mute">
            <strong className="tabular font-semibold text-paper">{fmt(stats.online)}</strong> online agora
          </div>
        ) : null}
      </div>
    </div>
  );
}
