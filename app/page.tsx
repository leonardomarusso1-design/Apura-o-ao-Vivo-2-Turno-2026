import StatsBar from "@/components/StatsBar";
import Countdown from "@/components/Countdown";
import WaitlistForm from "@/components/WaitlistForm";
import Sponsors from "@/components/Sponsors";
import PixSupport from "@/components/PixSupport";
import Heartbeat from "@/components/Heartbeat";
import { ELECTION_ISO, SITE_NAME } from "@/lib/env";

// Página estática: serve da CDN, zero custo de função no pico
export const dynamic = "force-static";

export default function Home() {
  return (
    <>
      <StatsBar />
      <Heartbeat electionIso={ELECTION_ISO} />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:pt-14">
        <p className="text-[11px] uppercase tracking-widest text-lime">{SITE_NAME} · 2º turno · 25 de outubro</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.05] sm:text-6xl">
          A apuração começa em breve. Seja avisado no segundo em que ela abrir.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-mute sm:text-lg">
          Mapa por estado e município, projeção do resultado final e comparação com 2022 — atualizados ao vivo, direto
          dos dados oficiais do TSE.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div className="grid gap-6">
            <Countdown target={ELECTION_ISO} />
            <p className="text-sm text-mute">
              Fim da votação: domingo, 25/10, às 17h (Brasília). A divulgação dos resultados segue o TSE.
            </p>
          </div>
          <WaitlistForm />
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Sponsors />
          <PixSupport />
        </div>

        <footer className="mt-14 border-t border-line pt-6 text-xs leading-relaxed text-mute">
          <p>
            Projeto independente, sem vínculo com o TSE, partidos, candidatos ou campanhas. Resultados oficiais:
            resultados.tse.jus.br. Projeções são estimativas e não representam resultado oficial.
          </p>
          <p className="mt-2">
            <a href="/privacidade" className="underline">
              Política de privacidade
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
