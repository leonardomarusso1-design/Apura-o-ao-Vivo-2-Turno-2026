import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { clientIp, hashIp } from "@/lib/ip";
import { limited } from "@/lib/ratelimit";
import { forbidden, readJson, sameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  if (await limited(`unsub:${hashIp(clientIp(req))}`, 10, 60)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const b = await readJson<{ token?: unknown }>(req, 512);
  const token = typeof b?.token === "string" && UUID.test(b.token) ? b.token : "";
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });

  const { error } = await db()
    .from("subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsub_token", token);

  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
