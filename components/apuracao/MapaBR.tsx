"use client";

import { BR_UFS, BR_VIEWBOX } from "@/lib/br-map";
import type { Area } from "@/lib/apuracao/types";

type Props = {
  ufs: Record<string, Area>;
  cor: (n: number | undefined) => string;
  selecionada: string | null;
  onSelect: (uf: string) => void;
};

export default function MapaBR({ ufs, cor, selecionada, onSelect }: Props) {
  return (
    <svg viewBox={BR_VIEWBOX} className="h-auto w-full" role="img" aria-label="Mapa do Brasil por estado">
      {BR_UFS.map((u) => {
        const id = u.id.toUpperCase();
        const a = ufs[id];
        const lider = a && a.validos > 0 ? a.cands[0] : undefined;
        // intensidade pela margem: 50% = fraco, 70%+ = forte
        const forca = lider ? Math.min(1, Math.max(0.35, (lider.pct - 48) / 22 + 0.35)) : 1;
        const sel = selecionada === id;
        return (
          <path
            key={u.id}
            d={u.path}
            fill={lider ? cor(lider.n) : "#222d29"}
            fillOpacity={lider ? forca : 1}
            stroke={sel ? "#f3f1ea" : "#0a0d0c"}
            strokeWidth={sel ? 2.2 : 0.9}
            className="cursor-pointer transition-opacity hover:opacity-80"
            onClick={() => onSelect(id)}
            tabIndex={0}
            role="button"
            aria-label={`${u.nome}${lider ? `: ${lider.nome} lidera` : ": sem dados"}`}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(id)}
          />
        );
      })}
    </svg>
  );
}
