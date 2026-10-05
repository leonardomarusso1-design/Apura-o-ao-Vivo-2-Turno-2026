import { NextResponse } from "next/server";

/**
 * Proteção CSRF/abuso para rotas POST: exige que o Origin (ou Referer) seja do próprio site.
 * Requisições de navegador sempre enviam Origin em POST cross-site.
 */
export function sameOrigin(req: Request): boolean {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!host || !origin) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function forbidden() {
  return NextResponse.json({ ok: false, error: "Origem não permitida." }, { status: 403 });
}

/** Lê JSON com limite de tamanho (evita payload gigante). */
export async function readJson<T>(req: Request, maxBytes = 4096): Promise<T | null> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > maxBytes) return null;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function assertProdConfig(): void {
  if (process.env.NODE_ENV === "production" && (process.env.IP_HASH_SALT ?? "dev").length < 24) {
    throw new Error("IP_HASH_SALT ausente ou fraco em produção");
  }
}
