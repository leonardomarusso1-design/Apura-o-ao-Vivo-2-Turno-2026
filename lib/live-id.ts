/** Aceita o ID de 11 caracteres ou um link do YouTube (watch, live, embed, youtu.be). Devolve o ID ou null. */
export function idDeLive(texto: string | null | undefined): string | null {
  const t = (texto ?? "").trim();
  if (!t) return null;
  if (/^[\w-]{11}$/.test(t)) return t;
  try {
    const u = new URL(t.startsWith("http") ? t : `https://${t}`);
    const h = u.hostname.replace(/^www\.|^m\./, "");
    if (h === "youtu.be") {
      const id = u.pathname.slice(1, 12);
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (h === "youtube.com" || h === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = /^\/(?:live|embed|shorts)\/([\w-]{11})/.exec(u.pathname);
      if (m) return m[1];
    }
  } catch {
    /* link inválido */
  }
  return null;
}
