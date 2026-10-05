"use client";

import { useEffect, useMemo, useState } from "react";
import type { MunRes, Mun } from "@/lib/apuracao/municipios";
import Avatar from "./Avatar";
import { fmtInt, fmtPct } from "./types";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca por município dentro de um estado (lista oficial do TSE; resultado só do município escolhido). */
export default function MunicipioBusca({ uf, cargo, cor }: { uf: string; cargo: 1 | 3 | 5; cor: (n: number | undefined) => string }) {
  const [lista, setLista] = useState<Mun[] | null>(null);
  const [ativo, setAtivo] = useState(false); // só baixa a lista quando a pessoa clica no campo
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Mun | null>(null);
  const [res, setRes] = useState<MunRes | null | "erro">(null);

  useEffect(() => {
    let vivo = true;
    setLista(null);
    setSel(null);
    setRes(null);
    setQ("");
    if (!ativo) return;
    fetch(`/api/municipio?uf=${uf.toLowerCase()}`)
      .then((r) => r.json())
      .then((j: { municipios?: Mun[] }) => vivo && setLista(j.municipios ?? []))
      .catch(() => vivo && setLista([]));
    return () => {
      vivo = false;
    };
  }, [uf, ativo]);

  useEffect(() => {
    if (!sel) return;
    let vivo = true;
    setRes(null);
    fetch(`/api/municipio?uf=${uf.toLowerCase()}&cd=${sel.cd}&c=${cargo}`)
      .then((r) => r.json())
      .then((j: { ok: boolean; res: MunRes | null }) => vivo && setRes(j.ok && j.res ? j.res : "erro"))
      .catch(() => vivo && setRes("erro"));
    return () => {
      vivo = false;
    };
  }, [sel, uf, cargo]);

  const achados = useMemo(() => {
    const t = norm(q.trim());
    if (!lista || t.length < 2) return [];
    return lista.filter((m) => norm(m.nm).includes(t)).slice(0, 8);
  }, [lista, q]);

  return (
    <div className="mt-4 border-t border-white/[0.06] pt-3">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-mute" htmlFor={`mun-${uf}`}>
        Resultado por município
      </label>
      <input
        id={`mun-${uf}`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setAtivo(true)}
        placeholder={ativo && !lista ? "Carregando cidades…" : "Digite o nome da cidade…"}
        autoComplete="off"
        className="mt-1.5 h-10 w-full rounded-xl border border-line bg-black/30 px-3 text-sm outline-none focus:border-lime"
      />
      {ativo && lista && lista.length === 0 ? <p className="mt-1.5 text-xs text-mute">Lista de cidades indisponível agora.</p> : null}
      {achados.length > 0 && !sel ? (
        <ul className="mt-1.5 overflow-hidden rounded-xl border border-line bg-panel text-sm" role="listbox">
          {achados.map((m) => (
            <li key={m.cd}>
              <button
                className="block w-full px-3 py-2 text-left hover:bg-white/5"
                onClick={() => {
                  setSel(m);
                  setQ(m.nm);
                }}
              >
                {m.nm}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {sel ? (
        <div className="mt-3" aria-live="polite">
          {res === null ? (
            <p className="text-xs text-mute">Carregando {sel.nm}…</p>
          ) : res === "erro" ? (
            <p className="text-xs text-mute">O TSE ainda não divulgou {sel.nm} para este cargo.</p>
          ) : (
            <>
              <p className="tabular text-xs text-mute">
                <strong className="text-paper">{res.nm}</strong> · {fmtPct(res.pa, 1)}% apurado · {fmtInt(res.el)} eleitores
              </p>
              <ul className="mt-2 grid gap-2">
                {res.top.map((c) => (
                  <li key={c.sq} className="flex items-center gap-2.5">
                    <Avatar n={c.n} sq={c.sq} nome={c.nome} cor={cor(c.n)} size={28} />
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {c.nome} <span className="text-mute">({c.partido})</span>
                    </span>
                    <span className="tabular text-xs font-semibold">{fmtPct(c.pct, 1)}%</span>
                    <span className="tabular w-20 text-right text-[11px] text-mute">{fmtInt(c.votos)}</span>
                  </li>
                ))}
              </ul>
              <button
                className="mt-2 text-[11px] text-mute underline"
                onClick={() => {
                  setSel(null);
                  setQ("");
                }}
              >
                Buscar outra cidade
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
