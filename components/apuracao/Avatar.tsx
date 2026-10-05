"use client";

import { useState } from "react";

/**
 * Foto do candidato se existir em /public/candidatos/{n}.jpg; senão, iniciais num círculo colorido.
 * (Coloque as fotos oficiais do TSE nessa pasta: 13.jpg, 22.jpg...)
 */
export default function Avatar({ n, nome, cor, size = 36 }: { n?: number; nome: string; cor: string; size?: number }) {
  const [falhou, setFalhou] = useState(false);
  const iniciais = nome
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || nome.slice(0, 2).toUpperCase();

  if (n && !falhou) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/candidatos/${n}.jpg`}
        alt={nome}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFalhou(true)}
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
