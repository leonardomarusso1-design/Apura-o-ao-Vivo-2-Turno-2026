import { NextResponse } from "next/server";
import { lerReplay } from "@/lib/apuracao/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Linha do tempo gravada pelo próprio site desde o início da apuração (para o replay). */
export async function GET() {
  const pontos = process.env.APURACAO_MOCK === "1" ? [] : await lerReplay().catch(() => []);
  return NextResponse.json(
    { pontos },
    { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } },
  );
}
