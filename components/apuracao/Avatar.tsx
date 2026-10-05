"use client";

import { useState } from "react";

/**
 * Foto do candidato se existir em /public/candidatos/{sqcand}.jpg ou {número}.jpg; senão, iniciais num círculo colorido.
 * (Coloque as fotos oficiais do TSE nessa pasta: 13.jpg, 22.jpg...)
 */
export default function Avatar({
  n,
  sq,
  nome,
  cor,
  size = 36,
}: {
  n?: number;
  sq?: number;
  nome: string;
  cor: string;
  size?: number;
}) {
  // tenta /candidatos/{sqcand}.jpg (nome do arquivo do TSE) e depois /candidatos/{número}.jpg
  const fontes = [sq, n].filter((v): v is number => typeof v === "number" && v > 0).map((v) => `/candidatos/${v}.jpg`);
  const [idx, setIdx] = useState(0);
  const falhou = idx >= fontes.length;
  const iniciais = nome
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || nome.slice(0, 2).toUpperCase();

  if (!falhou) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fontes[idx]}
        alt={nome}
        width={size}
        height={size}
        loading="lazy"
        // a página já chega pronta do servidor: a imagem pode ter falhado ANTES do React assumir, então confere ao montar
        ref={(el) => {
          if (el && el.complete && el.naturalWidth === 0) setIdx((i) => i + 1);
        }}
        onError={() => setIdx((i) => i + 1)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, boxShadow: `0 0 0 2px ${cor}` }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-ink"
      style={{ width: size, height: size, background: cor }}
    >
      {iniciais}
    </span>
  );
}
