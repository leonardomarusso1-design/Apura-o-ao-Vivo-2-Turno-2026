/** Regras compartilhadas do ranking do joguinho (servidor e navegador). */
export const NOME_RE = /^[A-Za-z0-9_.]{3,16}$/;
export const TK_RE = /^[a-z0-9]{24,48}$/;
/** Teto de pontos por segundo de partida (medido pelo servidor). Acima disso o placar é recusado. */
export const MAX_PTS_POR_SEG = 150;
export const MIN_SEG = 4;

const PROIBIDOS = [
  "admin", "moderador", "suporte", "oficial", "tse",
  "lula", "flavio", "bolsonaro", "pt13", "pl22",
  "puta", "caralho", "porra", "merda", "fdp", "viado", "buceta", "cuzao", "arrombado", "nazi", "hitler", "estupr", "pedofil", "racista", "vadia", "otario",
];

const TROCA: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

/** Normaliza para comparar (minúsculas, sem . e _, números parecidos com letras). */
export const normaliza = (n: string) =>
  n
    .toLowerCase()
    .replace(/[._]/g, "")
    .replace(/[013457@$]/g, (m) => TROCA[m] ?? m);

/** null = nome permitido; senão, o motivo (texto pronto para mostrar). */
export function erroNome(nome: string): string | null {
  if (!NOME_RE.test(nome)) return "Use de 3 a 16 caracteres: letras, números, ponto ou _.";
  if (!/[A-Za-z]/.test(nome)) return "Coloque pelo menos uma letra.";
  const n = normaliza(nome);
  if (PROIBIDOS.some((p) => n.includes(normaliza(p)))) return "Esse nome não pode. Escolha outro.";
  return null;
}
