"use client";

import { useState } from "react";

/**
 * Avatar dos candidatos com acabamento de alta definição:
 * 1. Tenta foto oficial por SQCAND (/candidatos/{sq}.jpg)
 * 2. Tenta foto pelo número da urna (/candidatos/{n}.jpg)
 * 3. Fallback inteligente com gradiente sofisticado e iniciais nítidas
 */
export default function Avatar({
  n,
  sq,
  nome,
  cor,
  size = 48,
}: {
  n?: number;
  sq?: number;
  nome: string;
  cor: string;
  size?: number;
}) {
  const fontes = [sq, n].filter((v): v is number => typeof v === "number" && v > 0).map((v) => `/candidatos/${v}.jpg`);
  const [idx, setIdx] = useState(0);
  const falhou = idx >= fontes.length;
  
  const iniciais = nome
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || (nome.length >= 2 ? nome.slice(0, 2).toUpperCase() : "C");

  if (!falhou) {
    return (
      <div 
        className="relative shrink-0 overflow-hidden rounded-full ring-2"
        style={{ 
          width: size, 
          height: size, 
          boxShadow: `0 0 16px -2px ${cor}40`,
          borderColor: cor,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fontes[idx]}
          alt={nome}
          width={size}
          height={size}
          loading="eager"
          ref={(el) => {
            if (el && el.complete && el.naturalWidth === 0) setIdx((i) => i + 1);
          }}
          onError={() => setIdx((i) => i + 1)}
          className="h-full w-full object-cover object-top"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="relative flex shrink-0 items-center justify-center rounded-full font-bold uppercase tracking-wider text-white shadow-inner"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${cor}, #121820)`,
        boxShadow: `0 0 16px -2px ${cor}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
        border: `1.5px solid ${cor}`,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {iniciais}
    </div>
  );
}
