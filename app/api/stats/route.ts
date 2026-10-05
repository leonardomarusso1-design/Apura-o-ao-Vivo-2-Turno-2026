import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cache: { at: number; waiting: number } | null = null;
const TTL_MS = 10_000;

async function waitingCount(): Promise<number | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.waiting;
  try {
    const { data, error } = await db().rpc("waiting_count");
    if (error) throw error;
    const n = Number(data);
    cache = { at: Date.now(), waiting: n };
    return n;
  } catch (e) {
    console.error("waiting_count", e);
    return cache?.waiting ?? null;
  }
}

async function onlineCount(): Promise<number | null> {
  const bucket = Math.floor(Date.now() / 120_000);
  const keys = [0, 1].map((i) => `on:${bucket - i}`);
  const n = await redis<number>(["PFCOUNT", ...keys]);
  return typeof n === "number" ? n : null;
}

export async function GET() {
  const [waiting, online] = await Promise.all([waitingCount(), onlineCount()]);
  return NextResponse.json(
    { waiting, online },
    {
      headers: {
        // CDN absorve o pico: todos os usuários compartilham a mesma resposta por 10s
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    },
  );
}
