import ToqyStrip from "@/components/ToqyStrip";
import Heartbeat from "@/components/Heartbeat";
import JsonLdScript from "@/components/JsonLdScript";
import ApuracaoClient from "./ApuracaoClient";
import { ELECTION_ISO, SITE_NAME } from "@/lib/env";
import { PIX_PAYLOAD } from "@/lib/pix";
import { abs, breadcrumb, paginaWeb } from "@/lib/seo";
import { getSnapshot, publicSnapshot } from "@/lib/apuracao/snapshot";
import { projetar } from "@/lib/apuracao/projection";

const pct = (n: number, d = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Página de uma rodada (servidor): já chega com os números. */
export default async function PaginaApuracao({ turno }: { turno: 1 | 2 }) {
  const snap = await getSnapshot(turno).catch(() => null);
  const pixAtivo = Boolean(PIX_PAYLOAD);
  const initial = snap ? JSON.parse(JSON.stringify({ ...publicSnapshot(snap), projecao: projetar(snap) })) : null;

  // Resumo em texto para quem não roda JavaScript (buscadores, leitores de tela, assistentes de IA).
  const br = snap?.br ?? null;
  const top = br?.cands.slice(0, 2) ?? [];
  const resumo =
    br && top.length === 2 && br.pctApurado > 0
      ? `${turno}º turno: ${top[0].nome} tem ${pct(top[0].pct)}% e ${top[1].nome} tem ${pct(top[1].pct)}% dos votos válidos, com ${pct(br.pctApurado)}% das seções apuradas. Fonte: TSE.`
      : turno === 2
        ? "O 2º turno acontece em 25 de outubro de 2026. Os resultados aparecem aqui assim que o TSE começar a divulgar."
        : "Resultado do 1º turno das eleições 2026, com dados do TSE.";

  const path = `/apuracao/${turno}`;
  const nome = turno === 2 ? "Apuração ao vivo do 2º turno 2026" : "Resultado do 1º turno 2026";
  const grafo = {
    "@context": "https://schema.org",
    "@graph": [
      paginaWeb({ path, nome, descricao: resumo, modificadoEm: snap?.geradoEm }),
      breadcrumb([
        { nome: SITE_NAME, path: "/" },
        { nome, path },
      ]),
      {
        "@type": "Event",
        name: turno === 2 ? "2º turno das eleições gerais de 2026" : "1º turno das eleições gerais de 2026",
        startDate: turno === 2 ? "2026-10-25" : "2026-10-04",
        endDate: turno === 2 ? "2026-10-25" : "2026-10-04",
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        location: { "@type": "VirtualLocation", url: abs(path) },
        description: "Eleições gerais no Brasil. Resultados oficiais do TSE.",
        inLanguage: "pt-BR",
      },
    ],
  };

  return (
    // No computador a apuração cabe numa única tela (sem rolar a página); no celular rola normalmente.
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <JsonLdScript dados={grafo} />
      <p className="sr-only">{resumo}</p>
      <ToqyStrip />
      <Heartbeat electionIso={ELECTION_ISO} />
      <div className="lg:min-h-0 lg:flex-1">
        <ApuracaoClient initial={initial} turno={turno} pixAtivo={pixAtivo} />
      </div>
    </div>
  );
}
