import type { Metadata } from "next";
import ToqyStrip from "@/components/ToqyStrip";
import Heartbeat from "@/components/Heartbeat";
import ApuracaoClient from "@/components/apuracao/ApuracaoClient";
import { ELECTION_ISO, SITE_NAME } from "@/lib/env";
import { getSnapshot, publicSnapshot } from "@/lib/apuracao/snapshot";
import { projetar } from "@/lib/apuracao/projection";

export const metadata: Metadata = {
  title: `Apuração ao vivo — ${SITE_NAME}`,
  description: "Mapa, placar, projeção e atualizações da apuração do 2º turno em tempo real, com dados oficiais do TSE.",
};

// Página gerada no servidor e renovada a cada 10 s na CDN: já chega COM os números (sem "carregando…")
export const revalidate = 10;

export default async function Page() {
  const snap = await getSnapshot().catch(() => null);
  const initial = snap ? JSON.parse(JSON.stringify({ ...publicSnapshot(snap), projecao: projetar(snap) })) : null;
  return (
    // No computador a apuração cabe numa única tela (sem rolar a página); no celular rola normalmente.
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <ToqyStrip />
      <Heartbeat electionIso={ELECTION_ISO} />
      <div className="lg:min-h-0 lg:flex-1">
        <ApuracaoClient initial={initial} />
      </div>
    </div>
  );
}
