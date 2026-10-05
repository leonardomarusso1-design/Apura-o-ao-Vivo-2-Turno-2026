import { NextResponse } from "next/server";
import { redisPipeline } from "@/lib/redis";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/** Heartbeat anônimo p/ "online agora". HyperLogLog por minuto — custo fixo de memória. */
export async function POST(req: Request) {
  let sid = "";
  try {
    const b = (await req.json()) as { sid?: unknown };
    if (typeof b.sid === "string" && /^[\w-]{8,40}$/.test(b.sid)) sid = b.sid;
  } catch {
    /* ignore */
  }
  if (!sid) return new NextResponse(null, { status: 204 });

  const key = `on:${Math.floor(Date.now() / 60_000)}`;
  await redisPipeline([
    ["PFADD", key, sid],
    ["EXPIRE", key, 240],
  ]);
  return new NextResponse(null, { status: 204 });
}
