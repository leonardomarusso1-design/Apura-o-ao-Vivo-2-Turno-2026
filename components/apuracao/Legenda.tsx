import { COR_BLOCO, NOME_BLOCO, blocoDe } from "@/lib/apuracao/blocos";
import type { Cand } from "@/lib/apuracao/types";

export default function Legenda({ cands }: { cands: Cand[] }) {
  const blocos = [...new Set(cands.map((c) => blocoDe(c.partido)))];
  if (blocos.length === 0) return null;
  const ordem = (["esquerda", "centro", "direita", "outros"] as const).filter((b) => blocos.includes(b));
  
  return (
    <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-mute" aria-label="Legenda do mapa">
      {ordem.map((b) => (
        <li key={b} className="flex items-center gap-1.5 font-medium">
          <span 
            className="h-2 w-2 rounded-full" 
            style={{ 
              backgroundColor: COR_BLOCO[b][0],
              boxShadow: `0 0 6px ${COR_BLOCO[b][0]}80`
            }} 
          />
          <span className="text-paper/80">{NOME_BLOCO[b]}</span>
        </li>
      ))}
    </ul>
  );
}
