import type { Area, Snapshot } from "./types";

export type Projecao = {
  disponivel: boolean;
  cands: { n: number; nome: string; partido: string; votos: number; pct: number }[];
  ufsComDados: number;
  restantePct: number; // % do eleitorado ainda não apurado
  irreversivel: boolean; // diferença > votos que ainda podem entrar
  lider: number | null;
  votosRestantesMax: number;
};

const MIN_FRACAO = 0.02; // abaixo disso a extrapolação é ruído

/**
 * Projeção estado a estado: cada UF é extrapolada com a SUA própria proporção
 * (a ordem de apuração enviesa o total nacional) e depois somada.
 */
export function projetar(snap: Snapshot): Projecao {
  const areas: Area[] = Object.values(snap.ufs);
  const vazio: Projecao = {
    disponivel: false,
    cands: [],
    ufsComDados: 0,
    restantePct: 100,
    irreversivel: false,
    lider: null,
    votosRestantesMax: 0,
  };
  if (areas.length === 0) return vazio;

  const tot = new Map<number, { nome: string; partido: string; votos: number }>();
  let usadas = 0;
  let eleitoresTotal = 0;
  let eleitoresApur = 0;
  let restanteEleitores = 0;
  let votosRecebidos = 0;
  let eleitoresApurPositivo = 0;

  for (const a of areas) {
    eleitoresTotal += a.eleitores;
    eleitoresApur += a.eleitoresApurados;
    const f = a.eleitores > 0 ? a.eleitoresApurados / a.eleitores : 0;
    if (f > 0) {
      votosRecebidos += a.validos + a.brancos + a.nulos;
      eleitoresApurPositivo += a.eleitoresApurados;
    }
    restanteEleitores += Math.max(0, a.eleitores - a.eleitoresApurados);
    if (f < MIN_FRACAO) continue;
    usadas++;
    for (const c of a.cands) {
      const prev = tot.get(c.n) ?? { nome: c.nome, partido: c.partido, votos: 0 };
      prev.votos += c.votos / f;
      tot.set(c.n, prev);
    }
  }
  if (usadas === 0) return { ...vazio, restantePct: eleitoresTotal ? 100 - (eleitoresApur / eleitoresTotal) * 100 : 100 };

  const soma = [...tot.values()].reduce((s, x) => s + x.votos, 0);
  const cands = [...tot.entries()]
    .map(([n, x]) => ({ n, nome: x.nome, partido: x.partido, votos: Math.round(x.votos), pct: soma ? (x.votos / soma) * 100 : 0 }))
    .sort((a, b) => b.votos - a.votos);

  // Teto de votos que ainda podem entrar: eleitores restantes × taxa de comparecimento observada
  const taxa = eleitoresApurPositivo > 0 ? Math.min(1, votosRecebidos / eleitoresApurPositivo) : 0.8;
  const votosRestantesMax = Math.round(restanteEleitores * Math.min(1, taxa + 0.05));

  // Diferença atual real (não projetada) entre 1º e 2º, somando UFs
  const reais = new Map<number, number>();
  for (const a of areas) for (const c of a.cands) reais.set(c.n, (reais.get(c.n) ?? 0) + c.votos);
  const ord = [...reais.entries()].sort((a, b) => b[1] - a[1]);
  const dif = ord.length >= 2 ? ord[0][1] - ord[1][1] : 0;

  return {
    disponivel: true,
    cands,
    ufsComDados: usadas,
    restantePct: eleitoresTotal ? 100 - (eleitoresApur / eleitoresTotal) * 100 : 100,
    irreversivel: ord.length >= 2 && dif > votosRestantesMax,
    lider: cands[0]?.n ?? null,
    votosRestantesMax,
  };
}
