import { redis } from "@/lib/redis";
import { BASE, parseArea } from "./tse";

export type Mun = { cd: string; nm: string; cdi?: string };
export type CandMun = { sq: number; n: number; nome: string; partido: string; votos: number; pct: number };
export type MunRes = { cd: string; nm: string; uf: string; pa: number; el: number; v: number; top: CandMun[] };

const UA = { Accept: "application/json", "User-Agent": "apuracao-ao-vivo/1.0 (+contato via site)" };
const pad = (n: number, w: number) => String(n).padStart(w, "0");
const memList = new Map<string, Mun[]>();

type CfgMun = { abr?: { cd?: string; mu?: { cd?: string; cdi?: string; nm?: string }[] }[] };

/** Lista de municípios de uma UF (config oficial do TSE; cache de 24h). */
export async function listarMunicipios(uf: string): Promise<Mun[]> {
  const u = uf.toLowerCase();
  const key = `mun:list:v2:${u}`;
  const c = await redis<string>(["GET", key]);
  if (typeof c === "string") {
    try {
      return JSON.parse(c) as Mun[];
    } catch {
      /* refaz */
    }
  }
  const m = memList.get(u);
  if (m) return m;
  try {
    const r = await fetch(`${BASE}/oficial/ele2026/6257/config/mun-e006257-cm.json`, { headers: UA, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!r.ok) return [];
    const j = (await r.json()) as CfgMun;
    const lista = (j.abr?.find((a) => a.cd?.toLowerCase() === u)?.mu ?? [])
      .filter((x): x is { cd: string; nm: string; cdi?: string } => Boolean(x.cd && x.nm))
      .map((x) => ({ cd: String(x.cd), nm: x.nm, cdi: x.cdi ? String(x.cdi) : undefined }))
      .sort((a, b) => a.nm.localeCompare(b.nm, "pt-BR"));
    if (lista.length) {
      memList.set(u, lista);
      await redis(["SET", key, JSON.stringify(lista), "EX", 86400]);
    }
    return lista;
  } catch {
    return [];
  }
}

/** Resultado de 1 município (só códigos que existem na lista oficial: sem SSRF). */
export async function resultadoMunicipio(ele: number, cargo: 1 | 3 | 5, uf: string, cd: string): Promise<MunRes | null> {
  const u = uf.toLowerCase();
  const lista = await listarMunicipios(u);
  const mun = lista.find((x) => x.cd === cd);
  if (!mun) return null;
  const key = `mun:res:v1:${ele}:${cargo}:${u}${cd}`;
  const c = await redis<string>(["GET", key]);
  if (typeof c === "string") {
    try {
      return JSON.parse(c) as MunRes;
    } catch {
      /* refaz */
    }
  }
  try {
    const r = await fetch(`${BASE}/oficial/ele2026/${ele}/dados/${u}/${u}${cd}-c${pad(cargo, 4)}-e${pad(ele, 6)}-u.json`, {
      headers: UA,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const a = parseArea(u + cd, await r.json());
    if (!a || a.cands.length === 0) return null;
    const out: MunRes = {
      cd,
      nm: mun.nm,
      uf: u.toUpperCase(),
      pa: Math.round(a.pctApurado * 10) / 10,
      el: a.eleitores,
      v: a.validos,
      top: a.cands.slice(0, 6).map((x) => ({ sq: x.sq, n: x.n, nome: x.nome, partido: x.partido, votos: x.votos, pct: x.pct })),
    };
    await redis(["SET", key, JSON.stringify(out), "EX", 120]);
    return out;
  } catch {
    return null;
  }
}

export type ItemMapa = { cd: string; cdi?: string; nm: string; pa: number; vt?: number; top: { n: number; sq?: number; nome: string; partido: string; pct: number; v?: number }[] };
export type MapaMun = { geradoEm: string; itens: ItemMapa[] };
const memMapa = new Map<string, MapaMun>();

async function umMunicipio(ele: number, cargo: 1 | 3 | 5, u: string, m: Mun): Promise<ItemMapa | null> {
  try {
    const r = await fetch(`${BASE}/oficial/ele2026/${ele}/dados/${u}/${u}${m.cd}-c${pad(cargo, 4)}-e${pad(ele, 6)}-u.json`, {
      headers: UA,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const a = parseArea(u + m.cd, await r.json());
    if (!a || a.cands.length === 0) return null;
    return { cd: m.cd, cdi: m.cdi, nm: m.nm, pa: Math.round(a.pctApurado * 10) / 10, vt: a.validos, top: a.cands.slice(0, 6).map((c) => ({ n: c.n, sq: c.sq, nome: c.nome, partido: c.partido, pct: Math.round(c.pct * 10) / 10, v: c.votos })) };
  } catch {
    return null;
  }
}

/** Líder de TODOS os municípios de uma UF (para o mapa municipal). Uma coleta compartilhada (lock + cache), nunca por visitante. */
export async function mapaMunicipios(ele: number, cargo: 1 | 3 | 5, uf: string, ttlSeg: number): Promise<MapaMun | { pendente: true } | null> {
  const u = uf.toLowerCase();
  const key = `mun:map:v2:${ele}:${cargo}:${u}`;
  const c = await redis<string>(["GET", key]);
  if (typeof c === "string") {
    try {
      return JSON.parse(c) as MapaMun;
    } catch {
      /* refaz */
    }
  }
  const m = memMapa.get(key);
  if (m && Date.now() - new Date(m.geradoEm).getTime() < ttlSeg * 1000) return m;
  const got = await redis<string>(["SET", `mun:map:lock:${ele}:${cargo}:${u}`, "1", "NX", "EX", 60]);
  if (got !== "OK" && process.env.UPSTASH_REDIS_REST_URL) return m ?? { pendente: true };

  const lista = await listarMunicipios(u);
  if (!lista.length) return null;
  const itens: ItemMapa[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: 12 }, async () => {
      while (i < lista.length) {
        const r = await umMunicipio(ele, cargo, u, lista[i++]);
        if (r) itens.push(r);
      }
    }),
  );
  if (itens.length === 0) return null;
  const out: MapaMun = { geradoEm: new Date().toISOString(), itens };
  memMapa.set(key, out);
  await redis(["SET", key, JSON.stringify(out), "EX", ttlSeg]);
  return out;
}
