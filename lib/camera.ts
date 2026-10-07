import { idDeLive } from "./live-id";

/**
 * Câmera do Modo TV: um segundo vídeo (só a câmera) que entra no quadrinho do vídeo, em vez da live inteira.
 * Guardamos de forma normalizada: "yt:<id>", "tw:<canal>" ou "cf:<id>" (Cloudflare Stream).
 */
export type Camera = { tipo: "yt" | "tw" | "cf"; id: string };

export function lerCamera(texto: string | null | undefined): Camera | null {
  const t = (texto ?? "").trim();
  if (!t) return null;
  const m = /^(yt|tw|cf):([\w.-]{2,80})$/.exec(t);
  if (m) return { tipo: m[1] as Camera["tipo"], id: m[2] };
  const yt = idDeLive(t);
  if (yt) return { tipo: "yt", id: yt };
  try {
    const u = new URL(t.startsWith("http") ? t : `https://${t}`);
    const h = u.hostname.replace(/^www\.|^m\./, "");
    if (h === "twitch.tv" || h === "player.twitch.tv") {
      const canal = u.searchParams.get("channel") ?? u.pathname.split("/").filter(Boolean)[0];
      if (canal && /^\w{3,25}$/.test(canal)) return { tipo: "tw", id: canal.toLowerCase() };
    }
    if (h === "iframe.videodelivery.net") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^[\w-]{8,64}$/.test(id)) return { tipo: "cf", id };
    }
    const cf = /^customer-[\w-]+\.cloudflarestream\.com$/.test(h) ? u.pathname.split("/").filter(Boolean)[0] : null;
    if (cf && /^[\w-]{8,64}$/.test(cf)) return { tipo: "cf", id: cf };
  } catch {
    /* link inválido */
  }
  return null;
}

export const camToString = (c: Camera | null) => (c ? `${c.tipo}:${c.id}` : "");

/** Endereço do iframe. O Twitch exige o domínio de quem incorpora (parent). */
export function camSrc(c: Camera, host: string): string | null {
  if (c.tipo === "yt") return `https://www.youtube-nocookie.com/embed/${c.id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&controls=0`;
  if (c.tipo === "tw") return host ? `https://player.twitch.tv/?channel=${c.id}&parent=${encodeURIComponent(host)}&muted=true&autoplay=true` : null;
  return `https://iframe.videodelivery.net/${c.id}?autoplay=true&muted=true&controls=false&loop=false`;
}
