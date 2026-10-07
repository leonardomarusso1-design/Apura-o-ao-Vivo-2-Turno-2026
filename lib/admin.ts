import { timingSafeEqual } from "node:crypto";

/** Senha de admin = ADMIN_SECRET (Bearer), comparada em tempo constante. */
export function adminOk(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 24) return false;
  const dado = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(dado);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
