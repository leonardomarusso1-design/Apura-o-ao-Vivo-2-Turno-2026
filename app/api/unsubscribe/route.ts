import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  let token = "";
  try {
    const b = (await req.json()) as { token?: unknown };
    if (typeof b.token === "string" && UUID.test(b.token)) token = b.token;
  } catch {
    /* ignore */
  }
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });

  const { error } = await db()
    .from("subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsub_token", token);

  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
