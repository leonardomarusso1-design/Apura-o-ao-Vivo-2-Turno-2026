import { redis } from "@/lib/redis";
import { BASE, parseArea } from "./tse";
import { EXT_CIDADES } from "@/lib/exterior-mapa";

export type CandCidade = { n: number; nome: string; partido: string; votos: number; pct: number };
export type CidadeRes = {
  cd: string;
  pa: number; // % de seções apuradas
  el: number; // eleitores aptos
  v: number; // votos válidos
  top: CandCidade[]; // 3 primeiros
};
export type ExteriorData = { geradoEm: string; ele: number; cidades: Record<string, CidadeRes> };

const FRESH_MS = 45_000;
const FRESH_PREVIA_MS = 300_000;
const key = (ele: number) => `ext:v1:${ele}`;
const lock = (ele: number) => `ext:lock:${ele}`;
const pad = (n: number, w: number) => String(n).padStart(w, "0");
const VALID = new Set(EXT_CIDADES.map((c) => c.cd)); // só buscamos códigos conhecidos (sem SSRF)

let mem: ExteriorData | null = null;

async function fetchCidade(cd: string, ele: number): Promise<CidadeRes | "none" | null> {
  if (!VALID.has(cd)) return null;
  try {
    const res = await fetch(`${BASE}/oficial/ele2026/${ele}/dados/zz/zz${cd}-c0001-e${pad(ele, 6)}-u.json`, {
      headers: { Accept: "application/json", "User-Agent": "apuracao-ao-vivo/1.0 (+contato via site)" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return "none";
    if (!res.ok) return null;
    const a = parseArea(cd, await res.json());
    if (!a) return "none";
    return {
      cd,
      pa: Math.round(a.pctApurado * 10) / 10,
      el: a.eleitores,
      v: a.validos,
      top: a.cands.slice(0, 3).map((c) => ({ n: c.n, nome: c.nome, partido: c.partido, votos: c.votos, pct: c.pct })),
    };
  } catch {
    return null;
  }
}

async function pool<T>(items: string[], size: number, fn: (x: string) => Promise<T>): Promise<T[]> {
  const out: T[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) out.push(await fn(items[i++]));
    }),
  );
  return out;
}

async function read(ele: number): Promise<ExteriorData | null> {
  const raw = await redis<string>(["GET", key(ele)]);
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ExteriorData;
    } catch {
      /* ignora */
    }
  }
  return mem?.ele === ele ? mem : null;
}

/** Cidades do exterior: 1 coleta a cada ~45s para todo mundo (lock no Redis), nunca por visitante. */
export async function getExterior(ele: number, previa: boolean): Promise<ExteriorData | null> {
  const cached = await read(ele);
  const maxAge = previa ? FRESH_PREVIA_MS : FRESH_MS;
  if (cached && Date.now() - new Date(cached.geradoEm).getTime() < maxAge) return cached;

  const got = await redis<string>(["SET", lock(ele), "1", "NX", "EX", 40]);
  if (got !== "OK" && cached) return cached; // outra instância está coletando
  if (await redis<string>(["GET", `ext:404:${ele}`])) return cached;

  // Sonda 1 cidade: se ainda não existe (404), não dispara as 186 requisições
  const probe = await fetchCidade(EXT_CIDADES[0].cd, ele);
  if (probe === "none") {
    await redis(["SET", `ext:404:${ele}`, "1", "EX", 60]);
    return cached;
  }
  const rest = EXT_CIDADES.slice(1).map((c) => c.cd);
  const found = await pool(rest, 8, (cd) => fetchCidade(cd, ele));
  const cidades: Record<string, CidadeRes> = { ...(cached?.cidades ?? {}) };
  for (const r of [probe, ...found]) if (r && r !== "none") cidades[r.cd] = r;
  const data: ExteriorData = { geradoEm: new Date().toISOString(), ele, cidades };
  mem = data;
  await redis(["SET", key(ele), JSON.stringify(data), "EX", 3600]);
  return data;
}
