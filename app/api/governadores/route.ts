import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/apuracao/snapshot";
import { getGovernadores, type GovData } from "@/lib/apuracao/governadores";

/** Dados fictícios só para o modo demonstração (APURACAO_MOCK=1). */
function mock(): GovData {
  const c = (n: number, nome: string, partido: string, pct: number, votos: number) => ({ n, nome, partido, pct, votos });
  const r = (a: ReturnType<typeof c>, b: ReturnType<typeof c>, pa = 100, eleito = false) => ({ pa, top: [a, b], eleito });
  return {
    geradoEm: new Date().toISOString(),
    r2Aberto: true,
    disputas: [
      { uf: "RN", segundoTurno: true, r1: r(c(22, "Candidato Um (demo)", "PL", 36.9, 700000), c(13, "Candidato Dois (demo)", "PT", 36.2, 690000)), r2: r(c(22, "Candidato Um (demo)", "PL", 50.8, 800000), c(13, "Candidato Dois (demo)", "PT", 49.2, 770000), 41) },
      { uf: "TO", segundoTurno: true, r1: r(c(55, "Candidata Três (demo)", "PSD", 45.5, 300000), c(22, "Candidato Quatro (demo)", "PL", 43.9, 290000)), r2: null },
      { uf: "MG", segundoTurno: true, r1: r(c(15, "Candidato Cinco (demo)", "MDB", 41, 2000000), c(40, "Candidato Seis (demo)", "PSB", 33, 1600000)), r2: null },
      { uf: "SP", segundoTurno: false, r1: r(c(10, "Candidato Sete (demo)", "REPUBLICANOS", 62.7, 9000000), c(13, "Candidato Oito (demo)", "PT", 36.4, 5000000), 100, true), r2: null },
      { uf: "BA", segundoTurno: false, r1: r(c(55, "Candidato Nove (demo)", "PSD", 55.1, 4000000), c(13, "Candidato Dez (demo)", "PT", 40, 3000000), 100, true), r2: null },
    ],
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const snap = await getSnapshot();
  // modo demonstração não consulta o TSE
  const data = snap.demo ? mock() : await getGovernadores(snap.previa).catch(() => null);
  return NextResponse.json(
    { ok: Boolean(data), ...(data ?? { geradoEm: null, r2Aberto: false, disputas: [] }) },
    { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" } },
  );
}
