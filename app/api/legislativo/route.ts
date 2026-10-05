import { NextResponse } from "next/server";
import { getLegislativo, type CargoLeg } from "@/lib/apuracao/legislativo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const c = Number(new URL(req.url).searchParams.get("c"));
  if (c !== 5 && c !== 6 && c !== 7) return NextResponse.json({ ok: false }, { status: 400 });
  const data = await getLegislativo(c as CargoLeg).catch(() => null);
  return NextResponse.json(
    { ok: Boolean(data), data },
    { headers: { "Cache-Control": data ? "public, s-maxage=300, stale-while-revalidate=600" : "no-store" } },
  );
}
