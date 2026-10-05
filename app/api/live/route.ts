import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";

const CHANNEL = process.env.LIVE_CHANNEL_ID ?? "UCxz5GwRSk1EU7UgcMlXotdA";
const KEY = "live:state";
const TTL = 60;

type Live = { live: boolean; videoId: string | null };

/** Descobre se o canal está ao vivo. 1 requisição ao YouTube por minuto no máximo (cache Redis + CDN). */
/** Método oficial (recomendado): YOUTUBE_API_KEY. Custa ~2 unidades de cota por checagem (limite grátis: 10.000/dia). */
async function detectApi(key: string): Promise<Live | null> {
  try {
    const up = "UU" + CHANNEL.slice(2); // playlist de uploads do canal (lives aparecem aqui)
    const a = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=8&playlistId=${up}&key=${encodeURIComponent(key)}`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (!a.ok) return null;
    const ids = ((await a.json()) as { items?: { contentDetails?: { videoId?: string } }[] }).items
      ?.map((i) => i.contentDetails?.videoId)
      .filter((x): x is string => typeof x === "string" && /^[\w-]{11}$/.test(x));
    if (!ids?.length) return { live: false, videoId: null };
    const b = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids.join(",")}&key=${encodeURIComponent(key)}`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (!b.ok) return null;
    const v = ((await b.json()) as { items?: { id: string; snippet?: { liveBroadcastContent?: string } }[] }).items?.find(
      (x) => x.snippet?.liveBroadcastContent === "live",
    );
    return v ? { live: true, videoId: v.id } : { live: false, videoId: null };
  } catch {
    return null;
  }
}

async function detect(): Promise<Live> {
  if (!/^UC[\w-]{22}$/.test(CHANNEL)) return { live: false, videoId: null };
  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    const viaApi = await detectApi(key);
    if (viaApi) return viaApi;
  }
  try {
    const r = await fetch(`https://www.youtube.com/channel/${CHANNEL}/live`, {
      headers: {
        "Accept-Language": "pt-BR,pt;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        // evita a tela de consentimento do YouTube para servidores (UE/EUA)
        Cookie: "SOCS=CAI; CONSENT=YES+cb",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return { live: false, videoId: null };
    const html = (await r.text()).slice(0, 1_500_000);
    const vid =
      html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)?.[1] ??
      html.match(/"videoDetails":\{"videoId":"([\w-]{11})"/)?.[1] ??
      null;
    const isLive = /"isLiveNow":true/.test(html) || /"isLive":true/.test(html);
    return vid && isLive ? { live: true, videoId: vid } : { live: false, videoId: null };
  } catch {
    return { live: false, videoId: null };
  }
}

export async function GET() {
  // Atalho manual: LIVE_VIDEO_ID=<id do vídeo> força a exibição (útil se a detecção falhar)
  const manual = process.env.LIVE_VIDEO_ID;
  if (manual && /^[\w-]{11}$/.test(manual)) return NextResponse.json({ live: true, videoId: manual });
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
