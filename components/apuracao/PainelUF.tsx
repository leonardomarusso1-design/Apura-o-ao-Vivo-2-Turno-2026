import { BR_UFS } from "@/lib/br-map";
import type { Area } from "@/lib/apuracao/types";
import { fmtInt, fmtPct } from "./types";
import Bandeira from "./Bandeira";
import Avatar from "./Avatar";

export default function PainelUF({
  uf,
  area,
  cor,
  onClose,
}: {
  uf: string;
  area: Area | undefined;
  cor: (n: number | undefined) => string;
  onClose: () => void;
}) {
  const nome = uf === "ZZ" ? "Exterior" : (BR_UFS.find((u) => u.id.toUpperCase() === uf)?.nome ?? uf);
  
  return (
    <section 
      className="glass-panel rise rounded-2xl p-4 sm:p-5 relative border border-white/[0.1] shadow-2xl" 
      aria-label={`Resultado em ${nome}`}
    >
      <div className="flex items-start justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Bandeira uf={uf} w={38} className="rounded-md shadow-md" />
          <div>
            <h2 className="font-bold text-lg sm:text-xl text-white flex items-center gap-2">
              {nome}
              <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-white/[0.06] text-mute uppercase">
                {uf}
              </span>
            </h2>
            <p className="tabular text-xs text-mute mt-0.5">
              {area ? (
                <>
                  <strong className="text-paper">{fmtPct(area.pctApurado, 1)}%</strong> apurado · {fmtInt(area.eleitores)} eleitores
                </>
              ) : uf === "ZZ" ? (
                "Totalização oficial divulgada pelo TSE a partir das 17h (Brasília)"
              ) : (
                "Aguardando primeiras urnas do estado pelo TSE"
              )}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-paper transition border border-white/[0.06]" 
          aria-label="Fechar"
        >
          Fechar
        </button>
      </div>

      {area ? (
        <div className="mt-4 grid gap-3">
          {area.cands.slice(0, 4).map((c, i) => {
            const candidatoCor = cor(c.n);
            return (
              <div 
                key={c.sq} 
                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <Avatar n={c.n} sq={c.sq} nome={c.nome} cor={candidatoCor} size={28} />
                    <span className="font-medium text-paper text-xs sm:text-sm">
                      {c.nome}
                      <span className="text-mute text-xs ml-1 font-normal">({c.partido})</span>
                    </span>
                  </div>
                  <div className="tabular font-bold text-base text-white">
                    {fmtPct(c.pct)}%
                  </div>
                </div>

                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/40 border border-white/[0.04]">
                  <div 
                    className="bar-grow h-full rounded-full" 
                    style={{ 
                      width: `${c.pct}%`, 
                      backgroundColor: candidatoCor,
                      boxShadow: `0 0 8px ${candidatoCor}50`
                    }} 
                  />
                </div>

                <div className="tabular mt-1.5 flex items-center justify-between text-[11px] text-mute">
                  <span>{fmtInt(c.votos)} votos</span>
                  {i === 0 && <span className="text-xs font-semibold" style={{ color: candidatoCor }}>Liderança</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
