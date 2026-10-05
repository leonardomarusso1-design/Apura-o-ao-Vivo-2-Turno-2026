/**
 * Classificação convencional de partidos em blocos, usada SÓ para colorir o mapa.
 * É uma simplificação (a ciência política discute onde cada partido se encaixa) —
 * edite as listas abaixo para mudar. Partido desconhecido => "outros" (cinza).
 */
export type Bloco = "esquerda" | "centro" | "direita" | "outros";

const ESQUERDA = ["PT", "PSOL", "PCDOB", "PC DO B", "PDT", "PSB", "PV", "REDE", "PCB", "PSTU", "PCO", "UP", "ESQ"];
const DIREITA = ["PL", "NOVO", "PRTB", "REPUBLICANOS", "PP", "PROGRESSISTAS", "DC", "MISSAO", "MISSÃO", "AGIR", "PMB", "DIR"];
const CENTRO = ["PSD", "MDB", "UNIAO", "UNIÃO", "UNIÃO BRASIL", "UNIAO BRASIL", "AVANTE", "PODE", "PODEMOS", "PSDB", "CIDADANIA", "SOLIDARIEDADE", "MOBILIZA", "PRD", "CENTRO"];

const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, " ");

export function blocoDe(partido: string): Bloco {
  const p = norm(partido);
  if (ESQUERDA.includes(p)) return "esquerda";
  if (DIREITA.includes(p)) return "direita";
  if (CENTRO.includes(p)) return "centro";
  return "outros";
}

export const COR_BLOCO: Record<Bloco, string[]> = {
  // 1ª cor = padrão; as seguintes são variações quando 2 candidatos caem no mesmo bloco
  esquerda: ["#e5484d", "#ff8a8d", "#a8262b"],
  direita: ["#30a46c", "#7bd9a4", "#1d6f48"],
  centro: ["#f5b83d", "#ffd98a", "#b8821a"],
  outros: ["#8a9792", "#b4beba", "#5d6964"],
};

export const NOME_BLOCO: Record<Bloco, string> = {
  esquerda: "Esquerda",
  centro: "Centro",
  direita: "Direita",
  outros: "Outros",
};
