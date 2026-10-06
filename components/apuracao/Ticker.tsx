import type { Evento } from "@/lib/apuracao/types";

type Item = { t: string; p: boolean };

/** Mistura os patrocínios entre as notícias: um a cada 3 atualizações (e um no fim, se sobrar). */
function montar(textos: string[], patro: string[]): Item[] {
  if (!patro.length) return textos.map((t) => ({ t, p: false }));
  const out: Item[] = [];
  let k = 0;
  textos.forEach((t, i) => {
    out.push({ t, p: false });
    if ((i + 1) % 3 === 0) out.push({ t: patro[k++ % patro.length], p: true });
  });
  while (k < patro.length && k < 2) out.push({ t: patro[k++], p: true });
  return out;
}

/** Faixa de notícias correndo (estilo TV). Duplicamos o conteúdo para o loop ser contínuo. */
export default function Ticker({ eventos, patrocinios = [] }: { eventos: Evento[]; patrocinios?: string[] }) {
  const base = eventos.length ? eventos.slice(0, 12).map((e) => e.texto) : ["Acompanhe a apuração ao vivo. As atualizações aparecem aqui"];
  const itens = montar(base, patrocinios);
  const chars = itens.map((i) => i.t).join("").length;
  const dur = Math.max(25, Math.round(chars * 0.22));
  const bloco = (k: string) => (
    <div className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={k === "b"}>
      {itens.map((it, i) => (
        <span key={`${k}${i}`} className="whitespace-nowrap">
          <span className={`mr-3 ${it.p ? "text-amber" : "text-lime"}`}>●</span>
          {it.p ? <span className="mr-2 text-[11px] font-bold uppercase tracking-widest text-amber">Patrocínio</span> : null}
          {it.t}
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
