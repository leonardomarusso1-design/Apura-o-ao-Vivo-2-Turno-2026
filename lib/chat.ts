import { STICKER_RE, stickerDe } from "./chat-stickers";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const K_MSGS = "chat:v1:msgs"; // LIST (mais nova primeiro) de JSON Msg
export const K_NICKS = "chat:v1:nicks"; // HASH apelido-minúsculo -> uid
export const K_BAN = "chat:v1:ban"; // SET de uid banidos
export const K_OFF = "chat:v1:off"; // existe = chat desligado
export const MAX_MSGS = 200;
export const MAX_CHARS = 200;
export const COOKIE = "chat_s";
export const SESSAO_SEG = 60 * 60 * 12;

export type Resp = { u: string; m: string }; // citação da mensagem respondida (copiada no servidor)
export type Msg = { id: string; t: number; uid: string; u: string; m: string; r?: Resp; sv?: number }; // sv = valor (R$) do super chat aprovado
export type MsgPub = { id: string; t: number; u: string; m: string; r?: Resp; sv?: number };
export const K_SUPER_PEND = "chat:v1:super:pend"; // HASH id -> JSON SuperPend (aguardando você conferir o Pix)
export const K_SUPER_RANK = "chat:v1:super:rank"; // ZSET apelido -> total em R$
export const SUPER_VALORES = [5, 10, 20, 50, 100];
export type SuperPend = { id: string; t: number; uid: string; u: string; m: string; v: number };

export const clientId = () => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** uid = hash do "sub" do Google (nunca guardamos e-mail nem nome). */
export const uidDe = (sub: string) => createHash("sha256").update(`chat:${sub}`).digest("hex").slice(0, 24);

function segredo(): string {
  const s = process.env.CHAT_SECRET ?? process.env.ADMIN_SECRET ?? "";
  return s.length >= 24 ? s : "";
}

export function assinar(uid: string): string | null {
  const s = segredo();
  if (!s) return null;
  const exp = Math.floor(Date.now() / 1000) + SESSAO_SEG;
  const corpo = `${uid}.${exp}`;
  const sig = createHmac("sha256", s).update(corpo).digest("base64url");
  return `${corpo}.${sig}`;
}

export function uidDaSessao(cookieHeader: string | null): string | null {
  const s = segredo();
  if (!s || !cookieHeader) return null;
  const m = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!m) return null;
  const [uid, exp, sig] = m.slice(COOKIE.length + 1).split(".");
  if (!uid || !exp || !sig || !/^[a-f0-9]{24}$/.test(uid) || Number(exp) < Date.now() / 1000) return null;
  const esperado = createHmac("sha256", s).update(`${uid}.${exp}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b) ? uid : null;
}

export function cookieSessao(valor: string | null): string {
  const base = `${COOKIE}=${valor ?? ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${valor ? SESSAO_SEG : 0}`;
  return process.env.NODE_ENV === "production" ? `${base}; Secure` : base;
}

/* ---------- filtros ---------- */
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[01345 7@$!]/g, (c) => (c === " " ? " " : (LEET[c] ?? c)))
    .replace(/[^a-z ]/g, "")
    .replace(/(.)\1{2,}/g, "$1$1"); // aaaa -> aa
}
const colapsa = (s: string) => s.replace(/(.)\1+/g, "$1");

// Filtro enxuto: só palavras de ódio (preconceito), e só como palavra inteira, para não barrar conversa normal.
// Palavrões comuns e xingamentos entre torcidas passam; quem passar do ponto é apagado/banido no /admin/chat.
const PROIBIDAS = new Set(["crioulo", "crioula", "sapatao", "retardado", "retardada", "mongoloide", "viado", "viadao"]);

export function palavrao(texto: string): boolean {
  const c = colapsa(norm(texto));
  return c.split(" ").some((p) => p && PROIBIDAS.has(p));
}

export const temLink = (t: string) =>
  /(https?:|www\.|\.com|\.br\b|\.net|\.org|\.ly\b|bit\.ly|t\.me|wa\.me|@\w+|\(?\d{2}\)?\s?9?\d{4}[\s.-]\d{4}|\b\d{9,}\b)/i.test(t.normalize("NFD").replace(/[̀-ͯ]/g, ""));

export const APELIDO_RE = /^[\p{L}\p{N}_.-]{3,16}$/u;
const RESERVADOS = ["admin", "administrador", "moderador", "moderacao", "mod", "apuracao", "tse", "marusso", "leomvideomaker", "leomarussobr", "toqy", "gcard", "oficial", "suporte"];
export function erroApelido(n: string): string | null {
  if (!APELIDO_RE.test(n)) return "Apelido: 3 a 16 letras, números, ponto, _ ou -.";
  const x = norm(n).replace(/ /g, "");
  if (RESERVADOS.some((r) => x === r || (r.length >= 6 && x.includes(r)))) return "Esse apelido não pode ser usado.";
  if (palavrao(n) || temLink(n)) return "Escolha outro apelido.";
  return null;
}

export function limparMsg(m: unknown): { ok: true; m: string } | { ok: false; erro: string } {
  if (typeof m !== "string") return { ok: false, erro: "vazio" };
  if (STICKER_RE.test(m)) return stickerDe(m) ? { ok: true, m } : { ok: false, erro: "Figurinha inválida." };
  const t = m.replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠﻿]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return { ok: false, erro: "vazio" };
  if (t.length > MAX_CHARS) return { ok: false, erro: `Máximo de ${MAX_CHARS} caracteres.` };
  if (temLink(t)) return { ok: false, erro: "Links, @ e telefones não são permitidos." };
  if (palavrao(t)) return { ok: false, erro: "Mensagem bloqueada: sem palavrões ou ofensas." };
  if (t.length > 12 && t === t.toUpperCase() && /[A-ZÀ-Ý]{12}/.test(t)) return { ok: false, erro: "Sem gritar (CAPS)." };
  return { ok: true, m: t };
}
