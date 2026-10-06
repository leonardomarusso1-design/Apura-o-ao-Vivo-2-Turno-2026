import { redis } from "@/lib/redis";

export type Noticia = { t: string; titulo: string; fonte: string; url: string };

const UA = { "User-Agent": "Mozilla/5.0 (compatible; ApuracaoBot/1.0)", Accept: "application/rss+xml, application/xml, text/xml" };
const TTL_S = 180;
const MAX = 30;
const IDADE_MAX_MS = 48 * 3_600_000;

/** Só notícias em texto: sem vídeos e sem nada do grupo Globo. */
const GLOBO = /globo|\bg1\b|globonews|\bcbn\b|valor\s?(econ|inv)|\bvalor\b|[ée]poca|\bextra\b|gshow|infoglobo|pegn|\bgnt\b|sportv/i;
const VIDEO = /youtube|youtu\.be|\bv[ií]deo\b|assista|podcast|\bfotos?\b|galeria|\btv\b.*\bao vivo\b|\(live\)/i;

const FEEDS: { url: string; fonte?: string }[] = [
  { url: "https://news.google.com/rss/search?q=" + encodeURIComponent('(Lula OR "Flávio Bolsonaro") when:1d') + "&hl=pt-BR&gl=BR&ceid=BR:pt-419" },
  { url: "https://news.google.com/rss/search?q=" + encodeURIComponent('eleição "2º turno" OR TSE OR pesquisa presidente when:1d') + "&hl=pt-BR&gl=BR&ceid=BR:pt-419" },
  { url: "https://agenciabrasil.ebc.com.br/rss/politica/feed.xml", fonte: "Agência Brasil" },
  { url: "https://www.poder360.com.br/feed/", fonte: "Poder360" },
];

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const tag = (bloco: string, nome: string): string => {
  const m = bloco.match(new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`, "i"));
  return m ? decode(m[1]) : "";
};

/** Lê um RSS e devolve as notícias já filtradas. Exportada para teste. */
export function lerRss(xml: string, fontePadrao?: string, agora = Date.now()): Noticia[] {
  const out: Noticia[] = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const it = m[0];
    let titulo = tag(it, "title");
    const url = tag(it, "link") || (it.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "");
    const src = it.match(/<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/i);
    let fonte = (src ? decode(src[2]) : "") || fontePadrao || "";
    const srcUrl = src?.[1] ?? "";
    // Google Notícias coloca " - Veículo" no fim do título
    if (fonte && titulo.endsWith(` - ${fonte}`)) titulo = titulo.slice(0, -(fonte.length + 3)).trim();
    const data = Date.parse(tag(it, "pubDate") || tag(it, "dc:date"));
    if (!titulo || !/^https?:\/\//.test(url) || !Number.isFinite(data)) continue;
    if (agora - data > IDADE_MAX_MS || data - agora > 3_600_000) continue;
    if (GLOBO.test(fonte) || GLOBO.test(srcUrl) || GLOBO.test(url)) continue;
    if (VIDEO.test(titulo) || VIDEO.test(fonte) || VIDEO.test(url)) continue;
    out.push({ t: new Date(data).toISOString(), titulo, fonte: fonte || "Imprensa", url });
  }
  return out;
}

let mem: { at: number; itens: Noticia[] } | null = null;

export async function getNoticias(): Promise<Noticia[]> {
  const c = await redis<string>(["GET", "news:v1"]);
  if (typeof c === "string") {
    try {
      return JSON.parse(c) as Noticia[];
    } catch {
      /* refaz */
    }
  }
  if (mem && Date.now() - mem.at < TTL_S * 1000) return mem.itens;
  const got = await redis<string>(["SET", "news:lock", "1", "NX", "EX", 30]);
  if (got !== "OK" && process.env.UPSTASH_REDIS_REST_URL) return mem?.itens ?? [];

  const lotes = await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const r = await fetch(f.url, { headers: UA, cache: "no-store", signal: AbortSignal.timeout(7000) });
        return r.ok ? lerRss(await r.text(), f.fonte) : [];
      } catch {
        return [];
      }
    }),
  );
  const vistos = new Set<string>();
  const itens = lotes
    .flat()
    .sort((a, b) => b.t.localeCompare(a.t))
    .filter((n) => {
      const k = n.titulo.toLowerCase().replace(/[^a-z0-9à-ú]/g, "").slice(0, 60);
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .slice(0, MAX);
  if (itens.length) {
    mem = { at: Date.now(), itens };
    await redis(["SET", "news:v1", JSON.stringify(itens), "EX", TTL_S]);
  }
  return itens.length ? itens : (mem?.itens ?? []);
}
