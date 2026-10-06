/** Patrocínio do Modo TV (banner + frases da faixa), guardado no Redis e igual para todo mundo (site e OBS). */
export type Patro = { img: string; texto: string; faixas: string[] };

export const K_PATRO = "tv:patro:v1";
export const K_PATRO_IMG = "tv:patro:img:v1";
export const MAX_FAIXAS = 8;
export const MAX_IMG_CHARS = 600_000; // ~450 KB de imagem
export const IMG_DATA_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export type PatroSalvo = { texto: string; faixas: string[]; v: number; img: boolean };

export function limparTextos(texto: unknown, faixas: unknown): { texto: string; faixas: string[] } {
  const t = typeof texto === "string" ? texto.trim().slice(0, 120) : "";
  const f = Array.isArray(faixas)
    ? faixas
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim().slice(0, 160))
        .filter(Boolean)
        .slice(0, MAX_FAIXAS)
    : [];
  return { texto: t, faixas: f };
}
