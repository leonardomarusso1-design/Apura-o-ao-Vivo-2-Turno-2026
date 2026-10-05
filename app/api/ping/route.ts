import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { sameOrigin } from "@/lib/security";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/** Janela de 2 min por bucket; o cliente pinga a cada 120s. Os 2 últimos buckets = "online agora". */
const BUCKET_MS = 120_000;

const LUA =
  "redis.call('PFADD',KEYS[1],ARGV[1]); redis.call('EXPIRE',KEYS[1],ARGV[2]); return 1";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return new NextResponse(null, { status: 403 });
  let sid = "";
  try {
    const text = await req.text();
    if (text.length < 256) {
      const b = JSON.parse(text) as { sid?: unknown };
      if (typeof b.sid === "string" && /^[\w-]{8,40}$/.test(b.sid)) sid = b.sid;
    }
  } catch {
    /* ignore */
  }
  if (!sid) return new NextResponse(null, { status: 204 });

  const key = `on:${Math.floor(Date.now() / BUCKET_MS)}`;
  await redis(["EVAL", LUA, 1, key, sid, 900]); // 1 comando Redis por ping
  return new NextResponse(null, { status: 204 });
}
