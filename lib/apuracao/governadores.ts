import { redis } from "@/lib/redis";
import { BASE, parseArea } from "./tse";
import { UFS, type Area } from "./types";

/** 2026: governador 1º turno = 6259, 2º turno = 6260 (catálogo oficial do TSE, cargo 3, arquivos -c0003-). */
const ELE_R1 = Number(process.env.TSE_GOV_R1 ?? "6259");
const ELE_R2 = Number(process.env.TSE_GOV_R2 ?? "6260");
const pad = (n: number, w: number) => String(n).padStart(w, "0");

export type CandGov = { n: number; nome: string; partido: string; pct: number; votos: number };
export type DisputaGov = {
  uf: string;
  r1: { pa: number; top: CandGov[]; eleito: boolean };
  r2: { pa: number; top: CandGov[]; eleito: boolean } | null; // null = 2º turno ainda sem dados
  segundoTurno: boolean;
};
export type GovData = { geradoEm: string; r2Aberto: boolean; disputas: DisputaGov[] };

const urlGov = (uf: string, ele: number) =>
  `${BASE}/oficial/ele2026/${ele}/dados/${uf.toLowerCase()}/${uf.toLowerCase()}-c0003-e${pad(ele, 6)}-u.json`;

type Res = { kind: "ok"; area: Area } | { kind: "none" } | { kind: "error" };

async function fetchGov(uf: string, ele: number): Promise<Res> {
  try {
    const res = await fetch(urlGov(uf, ele), {
      headers: { Accept: "application/json", "User-Agent": "apuracao-ao-vivo/1.0 (+contato via site)" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return { kind: "none" };
    if (!res.ok) return { kind: "error" };
    const area = parseArea(uf, await res.json());
    return area ? { kind: "ok", area } : { kind: "none" };
  } catch {
    return { kind: "error" };
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

const resumo = (a: Area, n = 3) => ({
  pa: Math.round(a.pctApurado * 10) / 10,
  top: a.cands.slice(0, n).map((c) => ({ n: c.n, nome: c.nome, partido: c.partido, pct: c.pct, votos: c.votos })),
  eleito: a.definidoTse,
});

const KEY_R1 = "gov:r1:v1";
const KEY_R2 = "gov:r2:v1";
let memR1: Record<string, DisputaGov["r1"]> | null = null;
let memR2: { at: number; data: Record<string, DisputaGov["r2"]> } | null = null;

/** Regra do 2º turno: o líder do 1º turno não passou de 50% dos votos válidos. */
const vaiAoSegundo = (r1: DisputaGov["r1"]) => r1.pa >= 99.9 && r1.top.length > 1 && r1.top[0].pct <= 50 && !r1.eleito;

async function getR1(): Promise<Record<string, DisputaGov["r1"]>> {
  const cached = await redis<string>(["GET", KEY_R1]);
  if (typeof cached === "string") {
    try {
      return JSON.parse(cached) as Record<string, DisputaGov["r1"]>;
    } catch {
      /* ignora */
    }
  }
  if (memR1) return memR1;
  const res = await pool([...UFS], 6, async (uf) => ({ uf, r: await fetchGov(uf, ELE_R1) }));
  const out: Record<string, DisputaGov["r1"]> = {};
  for (const { uf, r } of res) if (r.kind === "ok") out[uf] = resumo(r.area);
  if (Object.keys(out).length >= 20) {
    memR1 = out;
    await redis(["SET", KEY_R1, JSON.stringify(out), "EX", 6 * 3600]); // 1º turno é resultado final: muda pouco
  }
  return out;
}

async function getR2(ufs: string[], fresh: number): Promise<Record<string, DisputaGov["r2"]>> {
  const raw = await redis<string>(["GET", KEY_R2]);
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw) as { at: number; data: Record<string, DisputaGov["r2"]> };
      if (Date.now() - j.at < fresh) return j.data;
    } catch {
      /* ignora */
    }
  } else if (memR2 && Date.now() - memR2.at < fresh) return memR2.data;

  const got = await redis<string>(["SET", "gov:r2:lock", "1", "NX", "EX", 25]);
  const stale = memR2?.data ?? {};
  if (got !== "OK" && Object.keys(stale).length) return stale;
  if (await redis<string>(["GET", "gov:r2:404"])) return stale;

  // Sonda: se o 1º estado ainda não tem 2º turno publicado (404), não consulta os demais
  const probe = await fetchGov(ufs[0], ELE_R2);
  const data: Record<string, DisputaGov["r2"]> = {};
  if (probe.kind === "none") {
    await redis(["SET", "gov:r2:404", "1", "EX", 60]);
    for (const uf of ufs) data[uf] = null;
  } else {
    const rest = await pool(ufs.slice(1), 4, async (uf) => ({ uf, r: await fetchGov(uf, ELE_R2) }));
    for (const { uf, r } of [{ uf: ufs[0], r: probe }, ...rest]) data[uf] = r.kind === "ok" ? resumo(r.area, 2) : (stale[uf] ?? null);
  }
  memR2 = { at: Date.now(), data };
  await redis(["SET", KEY_R2, JSON.stringify({ at: Date.now(), data }), "EX", 3600]);
  return data;
}

export async function getGovernadores(previa: boolean): Promise<GovData> {
  const r1 = await getR1();
  const ufsR2 = Object.entries(r1)
    .filter(([, v]) => vaiAoSegundo(v))
    .map(([uf]) => uf);
  const r2 = ufsR2.length ? await getR2(ufsR2, previa ? 120_000 : 25_000) : {};
  const disputas: DisputaGov[] = Object.entries(r1).map(([uf, v]) => ({
    uf,
    r1: v,
    r2: r2[uf] ?? null,
    segundoTurno: ufsR2.includes(uf),
  }));
  return { geradoEm: new Date().toISOString(), r2Aberto: Object.values(r2).some(Boolean), disputas };
}
