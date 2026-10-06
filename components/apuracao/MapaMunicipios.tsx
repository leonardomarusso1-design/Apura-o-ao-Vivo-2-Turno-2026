"use client";

import { useEffect, useMemo, useState } from "react";
import type { ItemMapa } from "@/lib/apuracao/municipios";
import { fmtInt, fmtPct, makeCor } from "./types";
import Avatar from "./Avatar";
import ZoomBox from "./ZoomBox";

type Geo = { vb: [number, number, number, number]; m: { i: string; n: string; d: string }[] };
type Resp = { ok: boolean; pendente?: boolean; itens?: ItemMapa[] };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Mapa de municípios de um estado: cada cidade colorida pelo líder (cor do bloco do partido). */
export default function MapaMunicipios({ uf, cargo, inicial = false, fit = false }: { uf: string; cargo: 1 | 3 | 5; inicial?: boolean; fit?: boolean }) {
  const [aberto, setAberto] = useState(inicial);
  const [geo, setGeo] = useState<Geo | null | "falta">(null);
  const [dados, setDados] = useState<ItemMapa[] | null>(null);
  const [tent, setTent] = useState(0);
  const [hover, setHover] = useState<{ x: number; y: number; it: ItemMapa; d: string } | null>(null);

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
      <div className={fit ? "min-h-0 flex-1" : "h-[60vh] max-h-[520px]"}>
      <ZoomBox>
      <svg viewBox={geo.vb.join(" ")} className="h-full w-full" role="img" aria-label={`Mapa dos municípios de ${uf}`}>
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
              onPointerMove={(e) => it && e.pointerType === "mouse" && setHover({ x: e.clientX, y: e.clientY, it, d: g.d })}
              onClick={(e) => it && setHover({ x: e.clientX, y: e.clientY, it, d: g.d })}
            />
          );
        })}
        {hover ? <path d={hover.d} fill="none" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" pointerEvents="none" /> : null}
      </svg>
      </ZoomBox>
      </div>
      {hover ? (
        <div
          className="pointer-events-none fixed z-50 w-[250px] rounded-2xl glass-panel-elevated border border-white/10 p-3 text-xs shadow-2xl"
          style={{ left: Math.min(hover.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1000) - 262), top: Math.min(hover.y + 14, (typeof window !== "undefined" ? window.innerHeight : 800) - 190) }}
        >
          <p className="border-b border-white/[0.06] pb-2 text-sm font-bold text-white">{hover.it.nm}</p>
          <div className="mt-2 grid gap-2">
            {hover.it.top.slice(0, 2).map((c) => (
              <div key={c.n} className="flex items-center gap-2.5">
                <Avatar n={c.n} sq={c.sq} nome={c.nome} cor={cor(c.n)} size={32} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate font-semibold text-paper">{c.nome}</span>
                  <span className="text-[11px]" style={{ color: cor(c.n) }}>
                    {c.partido}
                    {c.v !== undefined ? <span className="text-mute"> · {fmtInt(c.v)} votos</span> : null}
                  </span>
                </span>
                <strong className="tabular text-base text-white">{fmtPct(c.pct, 1)}%</strong>
              </div>
            ))}
          </div>
          <p className="mt-2 border-t border-white/[0.06] pt-2 text-[11px] text-mute">{fmtPct(hover.it.pa, 0)}% das seções</p>
        </div>
      ) : null}
    </div>
  );
}
