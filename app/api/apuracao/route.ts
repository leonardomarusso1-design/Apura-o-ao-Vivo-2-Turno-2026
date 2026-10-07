import { NextResponse } from "next/server";
import { getSnapshot, publicSnapshot, turnoDe } from "@/lib/apuracao/snapshot";
import { projetar } from "@/lib/apuracao/projection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const snap = await getSnapshot(turnoDe(req.url));
  return NextResponse.json(
    { ...publicSnapshot(snap), projecao: projetar(snap) },
    {
      headers: {
        // A CDN serve a mesma resposta a todos por 10s: o TSE nunca vê o tráfego dos usuários
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    },
  );
}
