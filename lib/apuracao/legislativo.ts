import { redis } from "@/lib/redis";
import { BASE } from "./tse";
import { blocoDe, type Bloco } from "./blocos";
import { UFS } from "./types";

/** Cargos legislativos 2026 (eleição estadual 1º turno = 6259): 5 Senador, 6 Dep. Federal, 7 Dep. Estadual (DF: 8 Distrital). */
const ELE = Number(process.env.TSE_LEG_ELE ?? "6259");
export type CargoLeg = 5 | 6 | 7;
export const CARGOS_LEG: CargoLeg[] = [5, 6, 7];

export type Eleito = { sq: number; uf: string; nome: string; partido: string; n: number; votos: number; pct: number; st: string };
export type LegData = {
  geradoEm: string;
  cargo: CargoLeg;
  ufsOk: number;
  vagas: number;
  definidas: number;
  blocos: Record<Bloco, number>;
  partidos: { sg: string; bloco: Bloco; cadeiras: number }[];
  porUf: Record<string, { vagas: number; definidas: number; top: Eleito[]; blocos: Record<Bloco, number> }>;
  eleitos: Eleito[]; // Senado: todos; demais: só os mais votados
};

const pad = (n: number, w: number) => String(n).padStart(w, "0");
const num = (v: unknown) => Number(String(v ?? "0").replace(",", ".")) || 0;

type RawCand = { sqcand?: string; n?: string; nmu?: string; nm?: string; e?: string; st?: string; vap?: string; pvapn?: string };
type RawPar = { sg?: string; cand?: RawCand[] };
type RawAgr = { par?: RawPar[] };
type RawFile = { carg?: { nv?: string; agr?: RawAgr[] }[] };

async function fetchUf(uf: string, cargo: CargoLeg): Promise<{ vagas: number; eleitos: Eleito[] } | null> {
  const c = cargo === 7 && uf === "DF" ? 8 : cargo;
  const l = uf.toLowerCase();
  const url = `${BASE}/oficial/ele2026/${ELE}/dados/${l}/${l}-c${pad(c, 4)}-e${pad(ELE, 6)}-u.json`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "apuracao-ao-vivo/1.0 (+contato via site)" },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as RawFile;
    const carg = j.carg?.[0];
    if (!carg) return null;
    const eleitos: Eleito[] = [];
    for (const agr of carg.agr ?? [])
      for (const par of agr.par ?? [])
        for (const cd of par.cand ?? [])
          if (cd.e === "s")
            eleitos.push({
              sq: num(cd.sqcand),
              uf,
              nome: cd.nmu || cd.nm || "",
              partido: par.sg ?? "",
              n: num(cd.n),
              votos: num(cd.vap),
              pct: num(cd.pvapn),
              st: cd.st ?? "Eleito",
            });
    return { vagas: num(carg.nv), eleitos };
  } catch {
    return null;
  }
}

async function pool<T>(items: readonly string[], size: number, fn: (x: string) => Promise<T>): Promise<T[]> {
  const out: T[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) out.push(await fn(items[i++]));
    }),
  );
  return out;
}

const mem = new Map<number, LegData>();

export async function getLegislativo(cargo: CargoLeg): Promise<LegData | null> {
  const key = `leg:v3:${ELE}:${cargo}`;
  const cached = await redis<string>(["GET", key]);
  if (typeof cached === "string") {
    try {
      return JSON.parse(cached) as LegData;
    } catch {
      /* refaz */
    }
  }
  const m = mem.get(cargo);
  if (m && Date.now() - new Date(m.geradoEm).getTime() < 3_600_000) return m;

  // um único worker baixa (arquivos grandes); os demais recebem o último resultado ou "carregando"
  const got = await redis<string>(["SET", `leg:lock:${cargo}`, "1", "NX", "EX", 90]);
  if (got !== "OK" && process.env.UPSTASH_REDIS_REST_URL) return m ?? null;

  const res = await pool(UFS, 5, async (uf) => ({ uf, r: await fetchUf(uf, cargo) }));
  const ok = res.filter((x) => x.r !== null);
  if (ok.length < 20) return m ?? null;

  const porUf: LegData["porUf"] = {};
  const todos: Eleito[] = [];
  const cont: Record<string, number> = {};
  let vagas = 0;
  for (const { uf, r } of ok) {
    if (!r) continue;
    vagas += r.vagas;
    todos.push(...r.eleitos);
    const bu: Record<Bloco, number> = { esquerda: 0, centro: 0, direita: 0, outros: 0 };
    for (const e of r.eleitos) bu[blocoDe(e.partido)]++;
    porUf[uf] = {
      blocos: bu,
      vagas: r.vagas,
      definidas: r.eleitos.length,
      top: [...r.eleitos].sort((a, b) => b.votos - a.votos).slice(0, cargo === 5 ? 3 : 1),
    };
    for (const e of r.eleitos) cont[e.partido] = (cont[e.partido] ?? 0) + 1;
  }
  const blocos: Record<Bloco, number> = { esquerda: 0, centro: 0, direita: 0, outros: 0 };
  const partidos = Object.entries(cont)
    .map(([sg, cadeiras]) => ({ sg, bloco: blocoDe(sg), cadeiras }))
    .sort((a, b) => b.cadeiras - a.cadeiras);
  for (const p of partidos) blocos[p.bloco] += p.cadeiras;

  const eleitos = cargo === 5 ? todos.sort((a, b) => a.uf.localeCompare(b.uf) || b.votos - a.votos) : [...todos].sort((a, b) => b.votos - a.votos).slice(0, 30);
  const data: LegData = { geradoEm: new Date().toISOString(), cargo, ufsOk: ok.length, vagas, definidas: todos.length, blocos, partidos, porUf, eleitos };
  mem.set(cargo, data);
  await redis(["SET", key, JSON.stringify(data), "EX", 6 * 3600]);
  return data;
}
