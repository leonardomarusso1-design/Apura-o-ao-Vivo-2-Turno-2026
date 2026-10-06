"use client";

import { useEffect, useMemo, useState } from "react";
import type { ItemMapa } from "@/lib/apuracao/municipios";
import { fmtPct, makeCor } from "./types";

type Geo = { vb: [number, number, number, number]; m: { i: string; n: string; d: string }[] };
type Resp = { ok: boolean; pendente?: boolean; itens?: ItemMapa[] };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Mapa de municípios de um estado: cada cidade colorida pelo líder (cor do bloco do partido). */
export default function MapaMunicipios({ uf, cargo, inicial = false, fit = false }: { uf: string; cargo: 1 | 3 | 5; inicial?: boolean; fit?: boolean }) {
  const [aberto, setAberto] = useState(inicial);
  const [geo, setGeo] = useState<Geo | null | "falta">(null);
  const [dados, setDados] = useState<ItemMapa[] | null>(null);
  const [tent, setTent] = useState(0);
  const [hover, setHover] = useState<{ x: number; y: number; it: ItemMapa } | null>(null);

  useEffect(() => {
    setAberto(inicial);
    setGeo(null);
    setDados(null);
    setTent(0);
  }, [uf, cargo, inicial]);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    fetch(`/geo/mun/${uf.toLowerCase()}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Geo>) : Promise.reject()))
      .then((g) => vivo && setGeo(g))
      .catch(() => vivo && setGeo("falta"));
    return () => {
      vivo = false;
    };
  }, [aberto, uf]);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    let t: ReturnType<typeof setTimeout> | undefined;
    fetch(`/api/municipios-mapa?uf=${uf.toLowerCase()}&c=${cargo}`)
      .then((r) => r.json() as Promise<Resp>)
      .then((j) => {
        if (!vivo) return;
        if (j.itens) setDados(j.itens);
        else if (j.pendente && tent < 8) t = setTimeout(() => setTent((x) => x + 1), 6000); // outra instância está coletando
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
      if (t) clearTimeout(t);
    };
  }, [aberto, uf, cargo, tent]);

  const { porId, porNome, cor } = useMemo(() => {
    const id = new Map<string, ItemMapa>();
    const nm = new Map<string, ItemMapa>();
    for (const it of dados ?? []) {
      if (it.cdi) id.set(it.cdi, it);
      nm.set(norm(it.nm), it);
    }
    return { porId: id, porNome: nm, cor: makeCor((dados ?? []).flatMap((i) => i.top.slice(0, 2).map((c) => ({ n: c.n, partido: c.partido })))) };
  }, [dados]);

  if (!aberto)
    return (
      <button onClick={() => setAberto(true)} className="mt-4 h-10 rounded-xl border border-line px-4 text-sm hover:bg-white/5">
        Ver mapa dos municípios
      </button>
    );
  if (geo === "falta") return <p className="mt-4 text-xs text-mute">O desenho dos municípios ainda não foi instalado neste site.</p>;
  if (!geo || !dados) return <div className="mt-4 h-48 animate-pulse rounded-xl bg-panel" role="status" aria-label="Carregando municípios" />;

  const achar = (g: Geo["m"][number]) => porId.get(g.i) ?? porId.get(g.i.slice(0, 6)) ?? porNome.get(norm(g.n));
  return (
    <div className={`relative ${fit ? "flex h-full flex-col" : "mt-4"}`} onPointerLeave={() => setHover(null)}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-mute">Municípios · {dados.length}</p>
      <svg viewBox={geo.vb.join(" ")} className={fit ? "min-h-0 w-full flex-1" : "max-h-[70vh] w-full"} role="img" aria-label={`Mapa dos municípios de ${uf}`}>
        {geo.m.map((g) => {
          const it = achar(g);
          const l = it?.top[0];
          const dif = it && it.top[1] ? it.top[0].pct - it.top[1].pct : 20;
          return (
            <path
              key={g.i}
              d={g.d}
              fill={l ? cor(l.n) : "#1a2230"}
              fillOpacity={l ? Math.min(1, 0.45 + dif / 40) : 0.6}
              stroke="#0d1117"
              strokeWidth={0.6}
              onPointerMove={(e) => it && e.pointerType === "mouse" && setHover({ x: e.clientX, y: e.clientY, it })}
              onClick={(e) => it && setHover({ x: e.clientX, y: e.clientY, it })}
            />
          );
        })}
      </svg>
      {hover ? (
        <div
          className="pointer-events-none fixed z-50 max-w-[240px] rounded-lg border border-line bg-ink/95 p-2 text-xs shadow-xl"
          style={{ left: Math.min(hover.x + 12, (typeof window !== "undefined" ? window.innerWidth : 1000) - 250), top: hover.y + 12 }}
        >
          <p className="font-semibold">{hover.it.nm}</p>
          {hover.it.top.map((c) => (
            <p key={c.n} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cor(c.n) }} />
                <span className="truncate">{c.nome}</span>
              </span>
              <span className="tabular">{fmtPct(c.pct, 1)}%</span>
            </p>
          ))}
          <p className="text-mute">{fmtPct(hover.it.pa, 0)}% apurado</p>
        </div>
      ) : null}
    </div>
  );
}
