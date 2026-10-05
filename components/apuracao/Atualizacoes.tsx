import type { Evento } from "@/lib/apuracao/types";
import UfIcone from "./UfIcone";
import Bandeira from "./Bandeira";

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default function Atualizacoes({ eventos, cor }: { eventos: Evento[]; cor: (n: number | undefined) => string }) {
  return (
    <section className="glass-panel rise rounded-2xl p-4 sm:p-5" aria-label="Últimas atualizações">
      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06] mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-paper">
            Tempo Real TSE
          </h2>
        </div>
        <span className="text-[10px] text-mute font-medium tabular">
          {eventos.length} avisos
        </span>
      </div>

      <ul className="h-72 xl:h-[25rem] space-y-2 overflow-y-auto overscroll-contain pr-1 text-xs">
        {eventos.length === 0 ? (
          <li className="py-8 text-center text-mute text-xs">
            Aguardando primeiras urnas totalizadas pelo TSE...
          </li>
        ) : (
          eventos.map((e, idx) => (
            <li 
              key={`${e.t}|${e.id}|${idx}`} 
              className="flash-in flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition"
            >
              {e.id === "ZZ" ? (
                <UfIcone uf={e.id} cor={e.candN ? cor(e.candN) : "#7e8d9f"} size={30} />
              ) : (
                <div className="pt-0.5">
                  <Bandeira uf={e.id} w={26} ring={e.candN ? cor(e.candN) : undefined} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] text-mute mb-0.5">
                  <span className="font-semibold text-paper/80">{e.id === "ZZ" ? "Exterior" : e.id}</span>
                  <span>·</span>
                  <span className="tabular">{hora(e.t)}</span>
                </div>
                <p className="text-paper/90 text-xs leading-snug">
                  {e.texto}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
