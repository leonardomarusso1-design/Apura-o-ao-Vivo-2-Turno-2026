/** Leilão das cotas de patrocínio: lances até a hora do corte; quem ganha é combinado e pago fora do site. */
export const K_LANCES = "leilao:v1:lances"; // HASH  id (sha do e-mail) -> JSON do lance
export const K_RANK = "leilao:v1:rank"; // ZSET  id -> valor em reais

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
};

export const COTAS = num(process.env.LEILAO_COTAS, 3);
export const LANCE_MIN = num(process.env.LEILAO_LANCE_MIN, 100);
export const INCREMENTO = num(process.env.LEILAO_INCREMENTO, 10);
export const LANCE_MAX = 1_000_000;
/** Corte dos lances (padrão: 25/10 às 15h de Brasília, duas horas antes da apuração). Troque na Vercel com LEILAO_ENCERRA_ISO. */
export const ENCERRA_ISO = process.env.LEILAO_ENCERRA_ISO || "2026-10-25T15:00:00-03:00";
export const encerraMs = () => {
  const t = Date.parse(ENCERRA_ISO);
  return Number.isFinite(t) ? t : Date.parse("2026-10-25T15:00:00-03:00");
};

export type Lance = {
  id: string;
  empresa: string;
  nome: string;
  whatsapp: string;
  email: string;
  valor: number;
  obs: string;
  ts: number;
  tsPrimeiro: number;
};

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Texto simples: tira quebras e limita o tamanho (nada disso vira HTML, mas fica limpo no painel). */
export function limpar(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}
