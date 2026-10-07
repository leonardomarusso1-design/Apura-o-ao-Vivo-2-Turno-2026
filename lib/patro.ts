/** Patrocínio (carrossel de imagens + frases da faixa + câmera do Modo TV), guardado no Redis e igual para todo mundo (site e OBS). */
export type Patro = { imgs: string[]; links: string[]; texto: string; faixas: string[]; camera: string; seg: number };

export const K_PATRO = "tv:patro:v1";
export const K_PATRO_IMG = "tv:patro:img:v1";
export const MAX_FAIXAS = 8;
export const MAX_IMGS = 4;
export const SEG_MIN = 4;
export const SEG_MAX = 30;
export const SEG_PADRAO = 8;
export const MAX_IMG_CHARS = 600_000; // ~450 KB de imagem
export const IMG_DATA_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

/** Chave da imagem i (a 0 mantém a chave antiga, então o que já estava salvo continua valendo). */
export const kImg = (i: number) => (i === 0 ? K_PATRO_IMG : `${K_PATRO_IMG}:${i}`);

export type PatroSalvo = { texto: string; faixas: string[]; v: number; imgs: boolean[]; links: string[]; camera: string; seg: number; img?: boolean };

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

/** Só aceita endereço http(s) válido (nada de javascript:). Vazio = sem link. */
export function limparLink(v: unknown): string {
  if (typeof v !== "string") return "";
  const t = v.trim().slice(0, 300);
  if (!t) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString().slice(0, 300) : "";
  } catch {
    return "";
  }
}

export function limparSeg(v: unknown): number {
  const n = typeof v === "number" ? Math.round(v) : Number.NaN;
  return Number.isFinite(n) ? Math.min(SEG_MAX, Math.max(SEG_MIN, n)) : SEG_PADRAO;
}

/** Lê o registro salvo (aceita o formato antigo, que tinha uma imagem só). */
export function normalizarSalvo(raw: unknown): PatroSalvo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<PatroSalvo>;
  const { texto, faixas } = limparTextos(r.texto, r.faixas);
  const imgs = Array.from({ length: MAX_IMGS }, (_, i) => (Array.isArray(r.imgs) ? r.imgs[i] === true : i === 0 && r.img === true));
  return {
    texto,
    faixas,
    v: typeof r.v === "number" ? r.v : 0,
    imgs,
    links: Array.from({ length: MAX_IMGS }, (_, i) => limparLink(Array.isArray(r.links) ? r.links[i] : "")),
    camera: typeof r.camera === "string" ? r.camera.slice(0, 200) : "",
    seg: limparSeg(r.seg),
  };
}
