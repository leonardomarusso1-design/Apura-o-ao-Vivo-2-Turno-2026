import type { Area, Cand } from "./types";

const BASE = process.env.TSE_BASE ?? "https://resultados.tse.jus.br";
export const ELEICAO = Number(process.env.TSE_ELEICAO ?? "6258"); // 6258 = Presidente 2º turno 2026

const pad = (n: number, w: number) => String(n).padStart(w, "0");

export const PREVIA = process.env.TSE_PREVIA_ELEICAO ? Number(process.env.TSE_PREVIA_ELEICAO) : null; // ex.: 6257 (1º turno) p/ prévia

export function urlFor(abr: string, ele: number = ELEICAO): string {
  const a = abr.toLowerCase();
  return `${BASE}/oficial/ele2026/${ele}/dados/${a}/${a}-c0001-e${pad(ele, 6)}-u.json`;
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

/** TSE manda números como string; inteiros sem separador, decimais com vírgula. */
function int(v: unknown): number {
  if (typeof v === "number") return Math.trunc(v);
  if (typeof v !== "string") return 0;
  const n = Number(v.replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function dec(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return 0;
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Percorre a árvore achando candidatos (objetos com sqcand+vap), ignorando vices (`vs`) e substituídos (`subs`). */
function collectCands(node: unknown, partido: string, out: Cand[]): void {
  if (Array.isArray(node)) {
    for (const x of node) collectCands(x, partido, out);
    return;
  }
  if (!isObj(node)) return;
  const sg = typeof node.sg === "string" ? node.sg : partido;
  if ("sqcand" in node && "vap" in node) {
    out.push({
      sq: int(node.sqcand),
      n: int(node.n),
      nome: str(node.nmu) || str(node.nm),
      partido: sg,
      votos: int(node.vap),
      pct: dec(node.pvap),
      eleito: node.e === "s",
    });
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === "vs" || k === "subs") continue;
    collectCands(v, sg, out);
  }
}

export function parseArea(id: string, raw: unknown): Area | null {
  if (!isObj(raw)) return null;
  const s = isObj(raw.s) ? raw.s : {};
  const e = isObj(raw.e) ? raw.e : {};
  const v = isObj(raw.v) ? raw.v : {};

  const cands: Cand[] = [];
  collectCands(raw.carg, "", cands);
  // dedupe por sqcand (caso o TSE repita), ordena por votos
  const uniq = [...new Map(cands.map((c) => [c.sq, c])).values()].sort((a, b) => b.votos - a.votos);

  const ts = int(s.ts);
  const st = int(s.st);
  const hasData = ts > 0 || uniq.length > 0;
  if (!hasData) return null;

  const dt = str(raw.dt);
  const ht = str(raw.ht);
  let totalizadoEm: string | null = null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dt);
  if (m && /^\d{2}:\d{2}:\d{2}$/.test(ht)) totalizadoEm = `${m[3]}-${m[2]}-${m[1]}T${ht}-03:00`;

  return {
    id: id.toUpperCase(),
    secoesTotal: ts,
    secoesApuradas: st,
    pctApurado: dec(s.pst) || (ts > 0 ? (st / ts) * 100 : 0),
    eleitores: int(e.te),
    eleitoresApurados: int(e.est),
    comparecimento: dec(e.pc),
    validos: int(v.vv),
    brancos: int(v.vb),
    nulos: int(v.tvn),
    cands: uniq,
    definidoTse: raw.md === "s" || raw.tf === "s" || uniq.some((c) => c.eleito),
    totalizadoEm,
  };
}

export type FetchResult =
  | { kind: "ok"; area: Area; etag: string | null }
  | { kind: "same" }
  | { kind: "none" } // 404 / ainda não gerado
  | { kind: "error" };

export async function fetchArea(abr: string, ele: number, etag?: string): Promise<FetchResult> {
  try {
    const res = await fetch(urlFor(abr, ele), {
      headers: {
        Accept: "application/json",
        "User-Agent": "apuracao-ao-vivo/1.0 (+contato via site)",
        ...(etag ? { "If-None-Match": etag } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 304) return { kind: "same" };
    if (res.status === 404) return { kind: "none" };
    if (!res.ok) return { kind: "error" };
    const area = parseArea(abr, await res.json());
    return area ? { kind: "ok", area, etag: res.headers.get("etag") } : { kind: "none" };
  } catch {
    return { kind: "error" };
  }
}
