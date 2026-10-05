"use client";

import { useEffect, useState } from "react";
import { BR_UFS } from "@/lib/br-map";
import { EXT_CIDADES } from "@/lib/exterior-mapa";
import Bandeira from "./Bandeira";

export default function BuscaModal({
  aberto,
  onClose,
  onSelectUf,
}: {
  aberto: boolean;
  onClose: () => void;
  onSelectUf: (uf: string) => void;
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && aberto) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aberto, onClose]);

  if (!aberto) return null;

  // sem acento e sem diferença de maiúsculas: "sao" encontra "São Paulo"
  const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const queryNorm = norm(q.trim());

  const ufsFiltradas = BR_UFS.filter(
    (u) =>
      norm(u.nome).includes(queryNorm) ||
      u.id.toLowerCase() === queryNorm ||
      norm(u.regiao).includes(queryNorm)
  );

  const exteriorFiltrado = EXT_CIDADES.filter(
    (c) =>
      norm(c.nome).includes(queryNorm) ||
      c.iso.toLowerCase() === queryNorm
  ).slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="glass-panel-elevated w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center px-4 border-b border-white/[0.08] bg-white/[0.02]">
          <svg className="w-5 h-5 text-mute shrink-0 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar estado brasileiro ou cidade no exterior..."
            className="w-full h-13 bg-transparent text-sm sm:text-base text-paper placeholder:text-mute outline-none"
          />
          <button 
            onClick={onClose}
            className="text-xs text-mute hover:text-paper px-2 py-1 rounded-md bg-white/[0.05]"
          >
            ESC
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-white/[0.04]">
          {/* Estados */}
          {ufsFiltradas.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-mute">
                Estados do Brasil
              </div>
              {ufsFiltradas.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    onSelectUf(u.id.toUpperCase());
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.06] transition text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <Bandeira uf={u.id} w={22} />
                    <span className="text-sm font-medium text-paper group-hover:text-white">
                      {u.nome}
                    </span>
                    <span className="text-xs text-mute uppercase font-mono">
                      {u.id}
                    </span>
                  </div>
                  <span className="text-xs text-mute">{u.regiao}</span>
                </button>
              ))}
            </div>
          )}

          {/* Exterior */}
          {exteriorFiltrado.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-mute">
                Cidades no Exterior
              </div>
              {exteriorFiltrado.map((c) => (
                <button
                  key={c.cd}
                  onClick={() => {
                    onSelectUf("ZZ");
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.06] transition text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <Bandeira iso={c.iso} w={22} />
                    <span className="text-sm font-medium text-paper group-hover:text-white">
                      {c.nome}
                    </span>
                  </div>
                  <span className="text-xs text-mute uppercase font-mono">{c.iso}</span>
                </button>
              ))}
            </div>
          )}

          {ufsFiltradas.length === 0 && exteriorFiltrado.length === 0 && (
            <div className="py-8 text-center text-sm text-mute">
              Nenhum resultado encontrado para &quot;{q}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
