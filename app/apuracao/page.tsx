import type { Metadata } from "next";
import StatsBar from "@/components/StatsBar";
import Heartbeat from "@/components/Heartbeat";
import ApuracaoClient from "@/components/apuracao/ApuracaoClient";
import { ELECTION_ISO, SITE_NAME } from "@/lib/env";

export const metadata: Metadata = {
  title: `Apuração ao vivo — ${SITE_NAME}`,
  description: "Mapa, placar, projeção e atualizações da apuração do 2º turno em tempo real, com dados oficiais do TSE.",
};

export const dynamic = "force-static";

export default function Page() {
  return (
    <>
      <StatsBar />
      <Heartbeat electionIso={ELECTION_ISO} />
      <ApuracaoClient />
    </>
  );
}
