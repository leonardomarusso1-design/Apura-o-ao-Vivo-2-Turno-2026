import { COR_BLOCO, NOME_BLOCO, blocoDe } from "@/lib/apuracao/blocos";
import type { Cand } from "@/lib/apuracao/types";

/** Legenda por texto + cor (não depende só de cor: ajuda quem tem daltonismo). */
export default function Legenda({ cands }: { cands: Cand[] }) {
  const blocos = [...new Set(cands.map((c) => blocoDe(c.partido)))];
  if (blocos.length === 0) return null;
  const ordem = (["esquerda", "centro", "direita", "outros"] as const).filter((b) => blocos.includes(b));
  return (
    <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-mute" aria-label="Legenda">
      {ordem.map((b) => (
        <li key={b} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_BLOCO[b][0] }} />
          {NOME_BLOCO[b]}
        </li>
      ))}
    </ul>
  );
}
