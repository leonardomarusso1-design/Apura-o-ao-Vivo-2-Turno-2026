import type { Area, Cand, Snapshot } from "./types";
import { UFS } from "./types";

/** Dados de DEMONSTRAÇÃO (fictícios). Nunca usar em produção real: APURACAO_MOCK=1 só para preview. */
const LEAN: Record<string, number> = {
  AC: 0.38, AL: 0.58, AM: 0.5, AP: 0.45, BA: 0.64, CE: 0.62, DF: 0.42, ES: 0.45, GO: 0.38, MA: 0.62,
  MG: 0.49, MS: 0.38, MT: 0.36, PA: 0.52, PB: 0.6, PE: 0.62, PI: 0.65, PR: 0.4, RJ: 0.46, RN: 0.58,
  RO: 0.34, RR: 0.33, RS: 0.44, SC: 0.34, SE: 0.6, SP: 0.45, TO: 0.46,
};
const ELE: Record<string, number> = {
  AC: 600e3, AL: 2.3e6, AM: 2.6e6, AP: 520e3, BA: 11.5e6, CE: 6.9e6, DF: 2.2e6, ES: 2.9e6, GO: 5e6, MA: 5.1e6,
  MG: 16.3e6, MS: 2e6, MT: 2.6e6, PA: 6e6, PB: 3e6, PE: 7.1e6, PI: 2.5e6, PR: 8.7e6, RJ: 13e6, RN: 2.5e6,
  RO: 1.2e6, RR: 380e3, RS: 8.5e6, SC: 5.5e6, SE: 1.7e6, SP: 34.7e6, TO: 1.1e6,
};

function rnd(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function area(id: string, ele: number, lean: number, prog: number): Area {
  const tot = Math.round(ele / 300);
  const apur = Math.round(tot * prog);
  const f = ele ? (apur * 300) / ele : 0;
  const validos = Math.round(ele * f * 0.74);
  const a = Math.round(validos * lean);
  const cands: Cand[] = [
    { sq: 1, n: 13, nome: "Candidato A (demo)", partido: "—", votos: a, pct: validos ? (a / validos) * 100 : 0, eleito: false },
    { sq: 2, n: 22, nome: "Candidato B (demo)", partido: "—", votos: validos - a, pct: validos ? ((validos - a) / validos) * 100 : 0, eleito: false },
  ].sort((x, y) => y.votos - x.votos);
  return {
    id, secoesTotal: tot, secoesApuradas: apur, pctApurado: prog * 100, eleitores: ele,
    eleitoresApurados: Math.round(ele * prog), comparecimento: 79, validos,
    brancos: Math.round(validos * 0.02), nulos: Math.round(validos * 0.03), cands, definidoTse: prog >= 1, totalizadoEm: null,
  };
}

export function mockSnapshot(): Snapshot {
  // Ciclo de 6 minutos: 0% → 100%, para ver o site "vivo"
  const cycle = ((Date.now() / 1000) % 360) / 360;
  const ufs: Record<string, Area> = {};
  UFS.forEach((uf, i) => {
    const delay = (i % 9) * 0.05;
    const prog = Math.min(1, Math.max(0, (cycle - delay) / (1 - 0.45)));
    ufs[uf] = area(uf, ELE[uf], LEAN[uf] + (rnd(i) - 0.5) * 0.01, Math.round(prog * 100) / 100);
  });
  const all = Object.values(ufs);
  const sum = (f: (a: Area) => number) => all.reduce((s, a) => s + f(a), 0);
  const va = sum((a) => a.cands.find((c) => c.n === 13)?.votos ?? 0);
  const vb = sum((a) => a.cands.find((c) => c.n === 22)?.votos ?? 0);
  const v = va + vb;
  const br: Area = {
    id: "BR", secoesTotal: sum((a) => a.secoesTotal), secoesApuradas: sum((a) => a.secoesApuradas),
    pctApurado: (sum((a) => a.secoesApuradas) / sum((a) => a.secoesTotal)) * 100,
    eleitores: sum((a) => a.eleitores), eleitoresApurados: sum((a) => a.eleitoresApurados), comparecimento: 79,
    validos: v, brancos: sum((a) => a.brancos), nulos: sum((a) => a.nulos),
    cands: [
      { sq: 1, n: 13, nome: "Candidato A (demo)", partido: "—", votos: va, pct: v ? (va / v) * 100 : 0, eleito: false },
      { sq: 2, n: 22, nome: "Candidato B (demo)", partido: "—", votos: vb, pct: v ? (vb / v) * 100 : 0, eleito: false },
    ].sort((x, y) => y.votos - x.votos),
    definidoTse: false, totalizadoEm: null,
  };
  return {
    turno: 2, eleicao: 0, geradoEm: new Date().toISOString(), demo: true, previa: false,
    status: cycle < 0.02 ? "aguardando" : cycle > 0.99 ? "finalizado" : "apurando",
    br, ufs, historico: [], eventos: [
      { t: new Date().toISOString(), id: "SP", pct: ufs.SP.pctApurado, texto: "SP chegou a " + Math.round(ufs.SP.pctApurado) + "% apurado (demonstração)" },
    ],
  };
}
