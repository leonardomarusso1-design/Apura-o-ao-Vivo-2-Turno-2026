"use client";

import { useEffect, useState } from "react";
import { MAX_FAIXAS, type Patro } from "@/lib/patro";

export type { Patro };

/** Enquanto não houver patrocinador, a faixa e o banner divulgam o TOQY. */
export const FAIXA_PADRAO = ["TOQY: crie seu link na bio e seu cartão digital profissional em minutos, em toqy.com.br"];

const env = (): Patro => ({
  img: "",
  texto: process.env.NEXT_PUBLIC_TV_BANNER_TEXTO ?? "",
  faixas: (process.env.NEXT_PUBLIC_TV_FAIXA ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_FAIXAS),
});

const imgOk = (s: string) => /^\/api\/patro\/img\?v=\d+$/.test(s);

/** Lê o patrocínio cadastrado em /admin/patro (igual no site e no OBS). Sem nada cadastrado, vale o padrão do ambiente. */
export function usePatro(): Patro {
  const [p, setP] = useState<Patro>(env);
  useEffect(() => {
    let vivo = true;
    let t: ReturnType<typeof setTimeout>;
    const ler = async () => {
      try {
        const r = await fetch("/api/patro");
        if (r.ok) {
          const j = (await r.json()) as Partial<Patro>;
          const base = env();
          if (vivo)
            setP({
              img: typeof j.img === "string" && imgOk(j.img) ? j.img : "",
              texto: typeof j.texto === "string" && j.texto ? j.texto.slice(0, 120) : base.texto,
              faixas: Array.isArray(j.faixas) && j.faixas.length ? j.faixas.map((x) => String(x).slice(0, 160)).slice(0, MAX_FAIXAS) : base.faixas,
            });
        }
      } catch {
        /* sem rede: mantém o que já está na tela */
      }
      if (vivo) t = setTimeout(ler, 30_000);
    };
    void ler();
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, []);
  return p;
}

/** Espaço do banner. Sem nada cadastrado, vira o convite para anunciar (é a venda do espaço). */
export function BannerTv({ p, fill = false, slim = false }: { p: Patro; fill?: boolean; slim?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-3xl border border-line bg-panel ${
        fill ? "min-h-[72px] max-h-[200px] flex-1" : slim ? "h-[clamp(48px,6vh,64px)] shrink-0" : "h-[clamp(72px,11vh,130px)] shrink-0"
      }`}
      aria-label="Publicidade"
    >
      {p.img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.img} alt={p.texto || "Publicidade"} className="h-full w-full object-contain" />
      ) : p.texto ? (
        <p className="px-4 text-center font-display text-[clamp(1rem,2vw,1.75rem)] font-bold leading-tight">{p.texto}</p>
      ) : (
        <div className="px-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-lime">Feito pelo criador deste site</p>
          <p className={`font-display font-bold leading-tight ${slim ? "text-xl" : "mt-1 text-[clamp(1.25rem,2.4vw,2.25rem)]"}`}>
            TOQY <span className="text-xs font-normal text-mute">toqy.com.br</span>
          </p>
          {slim ? null : <p className="text-sm text-mute">Seu link na bio e cartão digital em minutos · toqy.com.br</p>}
        </div>
      )}
    </div>
  );
}
