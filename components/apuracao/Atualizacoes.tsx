import type { Evento } from "@/lib/apuracao/types";
import UfIcone from "./UfIcone";
import Bandeira from "./Bandeira";

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default function Atualizacoes({ eventos, cor }: { eventos: Evento[]; cor: (n: number | undefined) => string }) {
  return (
    <section className="glow-card rounded-2xl border border-line bg-panel/95 p-4 sm:p-5" style={{ ["--d" as string]: "4s" }} aria-label="Últimas atualizações">
      <h2 className="text-sm font-semibold">Últimas atualizações</h2>
      {/* altura fixa + scroll: não empurra o resto da página */}
      <ul className="mt-3 h-72 xl:h-[26rem] space-y-3 overflow-y-auto overscroll-contain pr-1 text-sm">
        {eventos.length === 0 ? (
          <li className="text-mute">As atualizações aparecem aqui conforme os estados forem sendo apurados.</li>
        ) : (
          eventos.map((e) => (
            <li key={`${e.t}|${e.id}|${e.texto}`} className="flash-in grid grid-cols-[2.25rem_1fr] items-start gap-3 p-1">
              {e.id === "ZZ" ? (
                <UfIcone uf={e.id} cor={e.candN ? cor(e.candN) : "#8a9792"} size={36} />
              ) : (
                <span className="flex w-9 shrink-0 justify-center">
                  <Bandeira uf={e.id} w={34} ring={e.candN ? cor(e.candN) : undefined} />
                </span>
              )}
              <span className="min-w-0">
                <span className="tabular block text-[11px] text-mute">{hora(e.t)} · {e.id === "ZZ" ? "Exterior" : e.id}</span>
                <span className="block leading-snug">{e.texto}</span>
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
