const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}

/** Aceita (19) 99999-9999 / 5519999999999. Retorna dígitos com DDI 55 ou null. */
export function normalizePhoneBR(v: unknown): string | null {
  if (typeof v !== "string") return null;
  let d = v.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length !== 11 && d.length !== 10) return null;
  // Celular antigo sem o 9 (ex.: 11 9710-3695 -> 8 dígitos começando em 6-9): o WhatsApp só existe com o 9 na frente.
  if (d.length === 10 && /^[6-9]/.test(d.slice(2))) d = `${d.slice(0, 2)}9${d.slice(2)}`;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  if (d.length === 11 && d[2] !== "9") return null; // celular
  return `55${d}`;
}

export function cleanName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const n = v.trim().replace(/\s+/g, " ").slice(0, 80);
  return n.length >= 2 ? n : null;
}

export function cleanRef(v: unknown): string | null {
  return typeof v === "string" && /^[a-z0-9]{6,12}$/.test(v) ? v : null;
}

export function cleanUtm(v: unknown): string | null {
  return typeof v === "string" && /^[\w.-]{1,40}$/.test(v) ? v : null;
}
