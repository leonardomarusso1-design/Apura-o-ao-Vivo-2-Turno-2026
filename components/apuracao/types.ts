import type { Snapshot } from "@/lib/apuracao/types";
import type { Projecao } from "@/lib/apuracao/projection";

export type Payload = Omit<Snapshot, "etags"> & { projecao: Projecao };

export const fmtInt = (n: number) => new Intl.NumberFormat("pt-BR").format(Math.round(n));
export const fmtPct = (n: number, d = 2) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

const CORES = ["#c6f24e", "#7aa7ff", "#ffb547", "#ff8fb1", "#8a9792"];
/** Cor estável por número do candidato (ordem crescente do número entre os candidatos do BR). */
export function makeCor(numeros: number[]): (n: number | undefined) => string {
  const ord = [...new Set(numeros)].sort((a, b) => a - b);
  return (n) => (n === undefined ? "#2a332f" : CORES[Math.min(ord.indexOf(n), CORES.length - 1)] ?? CORES[4]);
}
