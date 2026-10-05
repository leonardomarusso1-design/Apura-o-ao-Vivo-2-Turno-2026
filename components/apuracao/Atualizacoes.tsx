import type { Evento } from "@/lib/apuracao/types";

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default function Atualizacoes({ eventos }: { eventos: Evento[] }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5" aria-label="Últimas atualizações">
      <h2 className="text-sm font-semibold">Últimas atualizações</h2>
      {/* altura fixa + scroll: não empurra o resto da página */}
      <ul className="mt-3 h-64 space-y-3 overflow-y-auto overscroll-contain pr-1 text-sm">
        {eventos.length === 0 ? (
          <li className="text-mute">As atualizações aparecem aqui conforme os estados forem sendo apurados.</li>
        ) : (
          eventos.map((e, i) => (
            <li key={`${e.t}-${i}`} className="grid grid-cols-[3rem_1fr] gap-2">
              <span className="tabular text-xs text-mute">{hora(e.t)}</span>
              <span className="leading-snug">{e.texto}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
