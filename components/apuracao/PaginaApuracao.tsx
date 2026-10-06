import ToqyStrip from "@/components/ToqyStrip";
import Heartbeat from "@/components/Heartbeat";
import ApuracaoClient from "./ApuracaoClient";
import { ELECTION_ISO } from "@/lib/env";
import { getSnapshot, publicSnapshot } from "@/lib/apuracao/snapshot";
import { projetar } from "@/lib/apuracao/projection";

/** Página de uma rodada (servidor): já chega com os números. */
export default async function PaginaApuracao({ turno }: { turno: 1 | 2 }) {
  const snap = await getSnapshot(turno).catch(() => null);
  const initial = snap ? JSON.parse(JSON.stringify({ ...publicSnapshot(snap), projecao: projetar(snap) })) : null;
  return (
    // No computador a apuração cabe numa única tela (sem rolar a página); no celular rola normalmente.
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <ToqyStrip />
      <Heartbeat electionIso={ELECTION_ISO} />
      <div className="lg:min-h-0 lg:flex-1">
        <ApuracaoClient initial={initial} turno={turno} />
      </div>
    </div>
  );
}
