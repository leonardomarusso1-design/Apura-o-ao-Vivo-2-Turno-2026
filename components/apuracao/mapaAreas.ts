import type { Area, Cand } from "@/lib/apuracao/types";

/** Área "sintética" para reaproveitar o MapaBR em outras abas (a cor vem de cands[0]). */
export function mkArea(id: string, cands: Cand[]): Area {
  const total = cands.reduce((a, c) => a + c.votos, 0);
  return {
    id,
    secoesTotal: 0,
    secoesApuradas: 0,
    pctApurado: 100,
    eleitores: 0,
    eleitoresApurados: 0,
    comparecimento: 0,
    validos: total > 0 ? total : 1,
    brancos: 0,
    nulos: 0,
    cands,
    definidoTse: true,
    totalizadoEm: null,
  };
}
