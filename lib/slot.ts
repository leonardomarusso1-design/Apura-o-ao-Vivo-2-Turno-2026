/** Espaço de anúncio no canto do mapa: compra direta por Pix, o preço dobra a cada venda aprovada. */
export const K_SLOT_ATUAL = "slot:v1:atual"; // JSON do anúncio no ar
export const K_SLOT_PRECO = "slot:v1:preco"; // preço para tomar o espaço agora
export const K_SLOT_PEND = "slot:v1:pend"; // HASH id -> pedido aguardando Pix/aprovação
export const MAX_PEND = 200;

const n = Number(process.env.SLOT_PRECO_INICIAL);
export const PRECO_INICIAL = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1000;

export type SlotAd = { marca: string; frase: string; site: string; pago: number; t: number };
export type SlotPend = { id: string; marca: string; frase: string; site: string; contato: string; preco: number; t: number; pagou: boolean };

/** O espaço não aceita nada sobre eleição, candidatos ou partidos. */
export const BLOQUEADO = /(lula|bolsonaro|fl[aá]vio|bolsomito|petis|\bpt\b|\bpl\b|partido|candidat|elei[cç]|vota[cç]|\bvote\b|presidente|\burnas?\b|\btse\b)/i;

export const brlInt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
