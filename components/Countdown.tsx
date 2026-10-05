"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export default function Countdown({ target }: { target: string }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const t = new Date(target).getTime();
    const tick = () => setLeft(t - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const p = left === null ? null : parts(left);
  const cells: [string, number | null][] = [
    ["dias", p?.d ?? null],
    ["horas", p?.h ?? null],
    ["min", p?.m ?? null],
    ["seg", p?.s ?? null],
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-label="Contagem regressiva para o fim da votação">
      {cells.map(([label, v]) => (
        <div key={label} className="rounded-xl border border-line bg-panel px-2 py-3 text-center">
          <div className="tabular font-display text-3xl leading-none sm:text-5xl">
            {v === null ? "––" : String(v).padStart(2, "0")}
          </div>
          <div className="mt-1.5 text-[11px] uppercase tracking-widest text-mute">{label}</div>
        </div>
      ))}
    </div>
  );
}
