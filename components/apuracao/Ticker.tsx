import type { Evento } from "@/lib/apuracao/types";

/** Faixa de notícias correndo (estilo TV). Duplicamos o conteúdo para o loop ser contínuo. */
export default function Ticker({ eventos }: { eventos: Evento[] }) {
  const itens = eventos.length ? eventos.slice(0, 12).map((e) => e.texto) : ["Acompanhe a apuração ao vivo — atualizações aparecem aqui"];
  const chars = itens.join("").length;
  const dur = Math.max(25, Math.round(chars * 0.22));
  const bloco = (k: string) => (
    <div className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={k === "b"}>
      {itens.map((t, i) => (
        <span key={`${k}${i}`} className="whitespace-nowrap">
          <span className="mr-3 text-lime">●</span>
          {t}
        </span>
      ))}
    </div>
  );
  return (
    <div className="flex h-12 items-center overflow-hidden rounded-2xl border border-line bg-panel" role="marquee" aria-label="Últimas atualizações">
      <span className="z-10 flex h-full shrink-0 items-center bg-paper px-5 text-sm font-bold text-ink">Últimas</span>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="ticker flex w-max text-base" style={{ animationDuration: `${dur}s` }}>
          {bloco("a")}
          {bloco("b")}
        </div>
      </div>
    </div>
  );
}
