import { redis } from "@/lib/redis";
import { BASE } from "./tse";
import { EXT_CIDADES } from "@/lib/exterior-mapa";
import type { CidadeRes } from "./exterior";

/**
 * Exterior pelos boletins de urna (BU) que o TSE publica seção a seção, antes da totalização oficial.
 * Fluxo: lista de seções (config .../zz-pNNNNNN-cs.json) -> para cada seção nova: aux.json -> bu.dat (ASN.1/BER) -> votos.
 * Cada BU é lido UMA vez e guardado no Redis (hash). A coleta roda sob lock, nunca por visitante.
 */
export type NomeCand = { sq?: number; n: number; nome: string; partido: string };

// pleito (cd_pleito) por eleição. Descobertos em /oficial/comum/config/ele-c.jws: 3220 = 1º turno, 3221 = 2º turno.
const PLEITO_DE: Record<number, number> = { 6257: 3220, 6258: 3221 };
const VALID = new Set(EXT_CIDADES.map((c) => c.cd));
const pad = (n: number, w: number) => String(n).padStart(w, "0");
const hkey = (pl: number) => `bu:v1:${pl}`;
const UA = { "User-Agent": "apuracao-ao-vivo/1.0 (+contato via site)" };

// ---------- leitor BER mínimo ----------
type No = { cls: number; tag: number; kids?: No[]; raw: Uint8Array };

function lerBER(b: Uint8Array, ini = 0, fim = b.length, prof = 0): No[] {
  const out: No[] = [];
  let p = ini;
  while (p < fim) {
    const t = b[p++];
    const cls = t >> 6;
    const cons = (t >> 5) & 1;
    let tag = t & 31;
    if (tag === 31) {
      tag = 0;
      let x: number;
      do {
        x = b[p++];
        tag = (tag << 7) | (x & 127);
      } while (x & 128 && p < fim);
    }
    let len = b[p++];
    if (len === undefined) throw new Error("BER truncado");
    if (len & 128) {
      const n = len & 127;
      if (n === 0 || n > 4) throw new Error("BER len");
      len = 0;
      for (let i = 0; i < n; i++) len = len * 256 + b[p++];
    }
    const e = p + len;
    if (e > fim) throw new Error("BER fora do limite");
    const raw = b.subarray(p, e);
    const no: No = { cls, tag, raw };
    if (prof < 12) {
      if (cons) no.kids = lerBER(b, p, e, prof + 1);
      else if (cls === 0 && tag === 4 && raw.length > 4 && raw[0] === 0x30) {
        try {
          no.kids = lerBER(b, p, e, prof + 1);
        } catch {
          /* octet string comum */
        }
      }
    }
    out.push(no);
    p = e;
  }
  return out;
}
const num = (n: No): number => n.raw.length <= 6 ? n.raw.reduce((a, c) => a * 256 + c, 0) : NaN;
const ehInt = (n: No | undefined): n is No => !!n && n.cls === 0 && n.tag === 2 && !n.kids;

export type BU = { a: number; v: Record<string, number>; b: number; n: number };

/** Extrai aptos e votos do bloco da eleição `ele`. Devolve null se o BU não tiver esse formato. */
export function lerBU(buf: Uint8Array, ele: number): BU | null {
  let raiz: No[];
  try {
    raiz = lerBER(buf);
  } catch {
    return null;
  }
  let a = -1;
  const v: Record<string, number> = {};
  let b = 0;
  let n = 0;
  let achou = false;
  const visita = (no: No) => {
    const k = no.kids;
    if (!k) return;
    if (a < 0 && ehInt(k[0]) && num(k[0]) === ele && ehInt(k[1]) && k.length >= 4) a = num(k[1]);
    const t = k.find((x) => x.cls === 2 && x.tag === 1);
    const q = k.find((x) => x.cls === 2 && x.tag === 2);
    if (t && q && !t.kids && !q.kids) {
      const tipo = num(t);
      const qt = num(q);
      if (Number.isFinite(qt)) {
        achou = true;
        if (tipo === 1) {
          const id = k.find((x) => x.cls === 2 && x.tag === 3);
          const ints = id?.kids?.filter(ehInt).map(num);
          const cod = ints && ints.length ? ints[ints.length - 1] : NaN;
          if (Number.isFinite(cod)) v[String(cod)] = (v[String(cod)] ?? 0) + qt;
        } else if (tipo === 2) b += qt;
        else if (tipo === 3) n += qt;
      }
    }
    k.forEach(visita);
  };
  raiz.forEach(visita);
  if (!achou || a < 0) return null;
  return { a, v, b, n };
}

// ---------- coleta ----------
async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { ...UA, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(9000) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

type CS = { abr?: { cd: string; mu?: { cd: string; zon?: { cd: string; sec?: { ns: string; da?: string }[] }[] }[] }[] };
type Aux = { hashes?: { hash: string; arq?: { nm: string; tp: string }[] }[] };

async function buscarBU(pl: number, ele: number, cd: string, zona: string, ns: string): Promise<BU | null> {
  const dir = `${BASE}/oficial/ele2026/arquivo-urna/${pl}/dados/zz/${cd}/${zona}/${ns}`;
  const aux = await getJSON<Aux>(`${dir}/p${pad(pl, 6)}-zz-m${cd}-z${zona}-s${ns}-aux.json`);
  const h = aux?.hashes?.filter((x) => x.arq?.some((f) => f.tp === "bu")).pop();
  const f = h?.arq?.find((x) => x.tp === "bu");
  if (!h || !f || !/^[0-9a-f]+$/i.test(h.hash) || !/^[\w.-]+$/.test(f.nm)) return null;
  try {
    const r = await fetch(`${dir}/${h.hash}/${f.nm}`, { headers: UA, cache: "no-store", signal: AbortSignal.timeout(9000) });
    if (!r.ok) return null;
    return lerBU(new Uint8Array(await r.arrayBuffer()), ele);
  } catch {
    return null;
  }
}

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>, ateMs: number): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length && Date.now() < ateMs) out.push(await fn(items[i++]));
    }),
  );
  return out;
}

export async function coletarBU(ele: number, nomes: NomeCand[]): Promise<Record<string, CidadeRes>> {
  const pl = Number(process.env.TSE_PLEITO_BU ?? PLEITO_DE[ele] ?? 0);
  if (!pl) return {};
  const ate = Date.now() + 18_000;
  const cs = await getJSON<CS>(`${BASE}/oficial/ele2026/arquivo-urna/${pl}/config/zz/zz-p${pad(pl, 6)}-cs.json`);
  if (!cs?.abr) return {};

  // seções por cidade e seções já publicadas
  const total: Record<string, number> = {};
  const publicadas: { cd: string; zona: string; ns: string; campo: string }[] = [];
  for (const a of cs.abr) for (const m of a.mu ?? []) {
    if (!VALID.has(m.cd)) continue;
    for (const z of m.zon ?? []) for (const s of z.sec ?? []) {
      total[m.cd] = (total[m.cd] ?? 0) + 1;
      if (s.da && /^\d+$/.test(z.cd) && /^\d+$/.test(s.ns)) publicadas.push({ cd: m.cd, zona: z.cd, ns: s.ns, campo: `${m.cd}:${z.cd}:${s.ns}` });
    }
  }

  const salvo = (await redis<string[]>(["HGETALL", hkey(pl)])) ?? [];
  const bus = new Map<string, BU>();
  for (let i = 0; i + 1 < salvo.length; i += 2) {
    try {
      bus.set(salvo[i], JSON.parse(salvo[i + 1]) as BU);
    } catch {
      /* ignora */
    }
  }

  const novas = publicadas.filter((s) => !bus.has(s.campo)).slice(0, 600);
  const lidas = await pool(novas, 24, async (s) => ({ s, bu: await buscarBU(pl, ele, s.cd, s.zona, s.ns) }), ate);
  const cmd: (string | number)[] = ["HSET", hkey(pl)];
  for (const { s, bu } of lidas) {
    if (!bu) continue;
    bus.set(s.campo, bu);
    cmd.push(s.campo, JSON.stringify(bu));
  }
  if (cmd.length > 2) {
    await redis(cmd);
    await redis(["EXPIRE", hkey(pl), 172800]);
  }

  // agrega por cidade (somente seções que ainda constam como publicadas)
  const ativos = new Set(publicadas.map((s) => s.campo));
  const por: Record<string, { sec: number; a: number; v: Record<string, number> }> = {};
  for (const [campo, bu] of bus) {
    if (!ativos.has(campo)) continue;
    const cd = campo.split(":")[0];
    const c = (por[cd] ??= { sec: 0, a: 0, v: {} });
    c.sec++;
    c.a += bu.a;
    for (const [n, q] of Object.entries(bu.v)) c.v[n] = (c.v[n] ?? 0) + q;
  }

  const nome = new Map(nomes.map((c) => [c.n, c]));
  const out: Record<string, CidadeRes> = {};
  for (const [cd, c] of Object.entries(por)) {
    const tot = total[cd] || c.sec;
    const validos = Object.values(c.v).reduce((x, y) => x + y, 0);
    const top = Object.entries(c.v)
      .map(([n, votos]) => {
        const info = nome.get(Number(n));
        return { sq: info?.sq, n: Number(n), nome: info?.nome ?? `Candidato ${n}`, partido: info?.partido ?? "", votos, pct: validos > 0 ? Math.round((votos / validos) * 1000) / 10 : 0 };
      })
      .sort((x, y) => y.votos - x.votos)
      .slice(0, 3);
    out[cd] = {
      cd,
      pa: Math.round((Math.min(c.sec, tot) / tot) * 1000) / 10,
      el: Math.round((c.a / Math.max(c.sec, 1)) * tot), // estimativa: média de aptos por seção publicada × seções da cidade
      v: validos,
      top,
    };
  }
  return out;
}
