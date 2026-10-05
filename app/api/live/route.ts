import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";

const CHANNEL = process.env.LIVE_CHANNEL_ID ?? "UCxz5GwRSk1EU7UgcMlXotdA";
const KEY = "live:state";
const TTL = 60;

type Live = { live: boolean; videoId: string | null };

/** Descobre se o canal está ao vivo. 1 requisição ao YouTube por minuto no máximo (cache Redis + CDN). */
async function detect(): Promise<Live> {
  if (!/^UC[\w-]{22}$/.test(CHANNEL)) return { live: false, videoId: null };
  try {
    const r = await fetch(`https://www.youtube.com/channel/${CHANNEL}/live`, {
      headers: { "Accept-Language": "pt-BR,pt;q=0.9", "User-Agent": "Mozilla/5.0 (compatible; ApuracaoBot/1.0)" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return { live: false, videoId: null };
    const html = (await r.text()).slice(0, 1_500_000);
    const vid = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)?.[1] ?? null;
    const isLive = /"isLiveNow":true/.test(html) || /"isLive":true/.test(html);
    return vid && isLive ? { live: true, videoId: vid } : { live: false, videoId: null };
  } catch {
    return { live: false, videoId: null };
  }
}

export async function GET() {
  let out: Live | null = null;
  const cached = await redis<string>(["GET", KEY]);
  if (cached) {
    try {
      const j = JSON.parse(cached) as Live;
      if (typeof j.live === "boolean") out = j;
    } catch {
      /* ignora */
    }
  }
  if (!out) {
    out = await detect();
    await redis(["SET", KEY, JSON.stringify(out), "EX", TTL]);
  }
  return NextResponse.json(out, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
