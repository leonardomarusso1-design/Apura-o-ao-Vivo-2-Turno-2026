import type { Evento } from "@/lib/apuracao/types";
import Avatar from "./Avatar";

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default function Atualizacoes({ eventos, cor }: { eventos: Evento[]; cor: (n: number | undefined) => string }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5" aria-label="Últimas atualizações">
      <h2 className="text-sm font-semibold">Últimas atualizações</h2>
      {/* altura fixa + scroll: não empurra o resto da página */}
      <ul className="mt-3 h-72 xl:h-[26rem] space-y-3 overflow-y-auto overscroll-contain pr-1 text-sm">
        {eventos.length === 0 ? (
          <li className="text-mute">As atualizações aparecem aqui conforme os estados forem sendo apurados.</li>
        ) : (
          eventos.map((e, i) => (
            <li key={`${e.t}-${i}`} className="grid grid-cols-[2.25rem_1fr] items-start gap-3">
              <Avatar n={e.candN} sq={e.candSq} nome={e.candNome ?? e.id} cor={e.candN ? cor(e.candN) : "#8a9792"} size={36} />
              <span className="min-w-0">
                <span className="tabular block text-[11px] text-mute">{hora(e.t)} · {e.id}</span>
                <span className="block leading-snug">{e.texto}</span>
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
