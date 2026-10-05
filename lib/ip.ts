import { createHash, randomBytes } from "node:crypto";

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "dev";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function newRefCode(len = 8): string {
  const bytes = randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
