import { redis, redisEnabled } from "@/lib/redis";
import { ELEICAO, PREVIA, fetchArea } from "./tse";
import { mockSnapshot } from "./mock";
import { UFS, type Area, type Evento, type Ponto, type Snapshot } from "./types";

const key = (ele: number) => `snap:v1:${ele}`;
const lockKey = (ele: number) => `snap:lock:${ele}`;
const FRESH_MS = 12_000; // não atualiza mais de 1x a cada 12s, não importa quantos acessem
const FRESH_PREVIA_MS = 300_000; // prévia (dados antigos) muda pouco
const MAX_EVENTOS = 80;
const MAX_PONTOS = 400;

const vazio = (ele: number): Snapshot => ({
  turno: ele === 6257 || ele === 6259 ? 1 : 2,
  eleicao: ele,
  previa: false,
  geradoEm: new Date().toISOString(),
  demo: false,
  status: "aguardando",
  br: null,
  ufs: {},
  eventos: [],
  historico: [],
});

const memSnap = new Map<number, Snapshot>();
const memInflight = new Map<number, Promise<Snapshot>>();

async function readCached(ele: number): Promise<Snapshot | null> {
  const raw = await redis<string>(["GET", key(ele)]);
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Snapshot;
    } catch {
      /* ignore */
    }
  }
  return memSnap.get(ele) ?? null;
}

const age = (s: Snapshot) => Date.now() - new Date(s.geradoEm).getTime();

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

async function build(ele: number, prev: Snapshot | null): Promise<Snapshot> {
  const abrs = ["br", ...UFS.map((u) => u.toLowerCase()), "zz"];
  const etags = { ...(prev?.etags ?? {}) };
  const ufs: Record<string, Area> = { ...(prev?.ufs ?? {}) };
  let br: Area | null = prev?.br ?? null;
  const eventos: Evento[] = [...(prev?.eventos ?? [])];

  // Evita martelar o TSE com 404: se já deu 404, só tenta de novo após 60s (compartilhado via Redis)
  const results = await pool(abrs, 6, async (abr) => {
    const blocked = await redis<string>(["GET", `tse404:${ele}:${abr}`]);
    if (blocked) return { abr, r: { kind: "none" as const } };
    const r = await fetchArea(abr, ele, etags[abr]);
    if (r.kind === "none") await redis(["SET", `tse404:${ele}:${abr}`, "1", "EX", 60]);
    return { abr, r };
  });

  for (const { abr, r } of results) {
    if (r.kind !== "ok") continue;
    if (r.etag) etags[abr] = r.etag;
    const a = r.area;
    if (abr === "br") {
      br = a;
      continue;
    }
    const id = abr.toUpperCase();
    const rot = id === "ZZ" ? "Exterior" : id;
    const before = ufs[id];
    ufs[id] = a;
    const mudouLider = before && before.cands[0]?.n !== a.cands[0]?.n;
    const avancou = !before || a.pctApurado - before.pctApurado >= 5 || (a.pctApurado >= 99.99 && before.pctApurado < 99.99);
    if (a.cands.length && (mudouLider || avancou)) {
      const l = a.cands[0];
      eventos.unshift({
        t: new Date().toISOString(),
        id,
        pct: a.pctApurado,
        candN: l.n,
        candSq: l.sq,
        candNome: l.nome,
        texto: mudouLider
          ? `${rot}: ${l.nome} assumiu a liderança (${a.pctApurado.toFixed(0)}% apurado)`
          : a.pctApurado >= 99.99
            ? `${rot}: apuração concluída — ${l.nome} lidera com ${l.pct.toFixed(1)}%`
            : `${rot}: ${a.pctApurado.toFixed(0)}% apurado — ${l.nome} lidera com ${l.pct.toFixed(1)}%`,
      });
    }
  }

  const historico: Ponto[] = [...(prev?.historico ?? [])];
  if (br && (historico.length === 0 || historico[historico.length - 1].pct !== br.pctApurado)) {
    historico.push({
      t: new Date().toISOString(),
      pct: br.pctApurado,
      c: br.cands.slice(0, 3).map((c) => ({ n: c.n, pct: c.pct })),
    });
  }

  const status: Snapshot["status"] = !br || br.pctApurado <= 0 ? "aguardando" : br.pctApurado >= 99.99 || br.definidoTse ? "finalizado" : "apurando";

  return {
    ...vazio(ele),
    geradoEm: new Date().toISOString(),
    status,
    br,
    ufs,
    etags,
    eventos: eventos.slice(0, MAX_EVENTOS),
    historico: historico.slice(-MAX_PONTOS),
  };
}

async function snapshotFor(ele: number, freshMs: number): Promise<Snapshot> {
  const cached = await readCached(ele);
  if (cached && age(cached) < freshMs) return cached;

  // Single-flight global via Redis (ou em memória, sem Redis)
  if (!redisEnabled) {
    const inflight = memInflight.get(ele);
    if (inflight) return inflight;
    const p = build(ele, cached).finally(() => memInflight.delete(ele));
    memInflight.set(ele, p);
    const snap = await p;
    memSnap.set(ele, snap);
    return snap;
  }

  const got = await redis<string>(["SET", lockKey(ele), "1", "NX", "EX", 20]);
  if (got !== "OK") return cached ?? vazio(ele); // outro worker já está atualizando (ou Redis fora)

  try {
    const snap = await build(ele, cached);
    await redis(["SET", key(ele), JSON.stringify(snap), "EX", 21600]);
    memSnap.set(ele, snap);
    return snap;
  } catch (e) {
    console.error("snapshot build", e);
    return cached ?? vazio(ele);
  } finally {
    await redis(["DEL", lockKey(ele)]);
  }
}

export async function getSnapshot(): Promise<Snapshot> {
  if (process.env.APURACAO_MOCK === "1") return mockSnapshot();

  const principal = await snapshotFor(ELEICAO, FRESH_MS);
  if (principal.status !== "aguardando" || PREVIA === null) return principal;

  // 2º turno ainda sem dados: mostra a rodada anterior como prévia (com aviso na tela)
  const previa = await snapshotFor(PREVIA, FRESH_PREVIA_MS);
  return previa.br ? { ...previa, previa: true } : principal;
}

/** Versão pública: remove campos internos (etags). */
export function publicSnapshot(s: Snapshot): Omit<Snapshot, "etags"> {
  const { etags: _etags, ...rest } = s;
  void _etags;
  return rest;
}
