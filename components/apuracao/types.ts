import type { Snapshot } from "@/lib/apuracao/types";
import type { Projecao } from "@/lib/apuracao/projection";
import { COR_BLOCO, blocoDe, type Bloco } from "@/lib/apuracao/blocos";

export type Payload = Omit<Snapshot, "etags"> & { projecao: Projecao };

export const fmtInt = (n: number) => new Intl.NumberFormat("pt-BR").format(Math.round(n));
export const fmtPct = (n: number, d = 2) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

/** Cor por candidato: vem do bloco do partido (esq. vermelho, dir. verde, centro âmbar). Dois no mesmo bloco ganham tons diferentes. */
export function makeCor(cands: { n: number; partido: string }[]): (n: number | undefined) => string {
  const usados: Record<Bloco, number> = { esquerda: 0, centro: 0, direita: 0, outros: 0 };
  const mapa = new Map<number, string>();
  for (const c of [...cands].sort((a, b) => a.n - b.n)) {
    if (mapa.has(c.n)) continue;
    const b = blocoDe(c.partido);
    const tons = COR_BLOCO[b];
    mapa.set(c.n, tons[Math.min(usados[b]++, tons.length - 1)]);
  }
  return (n) => (n === undefined ? "#2a332f" : (mapa.get(n) ?? COR_BLOCO.outros[0]));
}

export function blocosPresentes(cands: { partido: string }[]): Bloco[] {
  const set = new Set(cands.map((c) => blocoDe(c.partido)));
  return (["esquerda", "centro", "direita", "outros"] as Bloco[]).filter((b) => set.has(b));
}
