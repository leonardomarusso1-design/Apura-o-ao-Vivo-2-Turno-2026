export type Cand = {
  sq: number;
  n: number; // número na urna
  nome: string;
  partido: string;
  votos: number;
  pct: number; // % dos votos válidos
  eleito: boolean; // e="s" do TSE. No 1º turno vale também para quem vai ao 2º turno, então não significa eleito
  sit?: string; // situação oficial (campo st do TSE): "Eleito", "2º turno", "Não eleito"
};

export type Area = {
  id: string; // "BR", "SP", "ZZ"
  secoesTotal: number;
  secoesApuradas: number;
  pctApurado: number; // % de seções totalizadas
  eleitores: number;
  eleitoresApurados: number;
  comparecimento: number;
  validos: number;
  brancos: number;
  nulos: number;
  cands: Cand[]; // ordenado por votos desc
  definidoTse: boolean; // TSE marcou como definido
  totalizadoEm: string | null; // ISO, quando o TSE totalizou
  geracao?: string | null; // "dd/mm/aaaa hh:mm:ss": geração do arquivo no TSE (dg + hg)
  idg?: string | null; // identificador da geração no TSE
};

export type Evento = {
  t: string; // ISO
  id: string; // UF
  pct: number;
  texto: string;
  candN?: number; // nº do candidato citado (p/ foto/avatar)
  candSq?: number;
  candNome?: string;
};

export type Ponto = { t: string; pct: number; c: { n: number; pct: number; v?: number }[] };

export type Snapshot = {
  turno: 1 | 2;
  eleicao: number;
  geradoEm: string;
  demo: boolean;
  previa: boolean; // dados de rodada anterior exibidos como prévia
  status: "aguardando" | "apurando" | "finalizado";
  br: Area | null;
  ufs: Record<string, Area>;
  eventos: Evento[];
  historico: Ponto[];
  etags?: Record<string, string>;
};

export const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
] as const;

/** Ponto gravado da linha do tempo (replay). u = UF -> [nº do líder, % apurado]. */
export type PontoReplay = {
  t: string;
  pct: number;
  c: { n: number; pct: number; v: number }[];
  u: Record<string, [number, number]>;
};
