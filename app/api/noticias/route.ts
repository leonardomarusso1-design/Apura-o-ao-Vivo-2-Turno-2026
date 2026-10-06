import { NextResponse } from "next/server";
import { getNoticias } from "@/lib/apuracao/noticias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/** Manchetes de política (só texto, sem Globo): título, veículo e link para a matéria original. */
export async function GET() {
  const itens = await getNoticias().catch(() => []);
  return NextResponse.json({ ok: itens.length > 0, itens }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
}
