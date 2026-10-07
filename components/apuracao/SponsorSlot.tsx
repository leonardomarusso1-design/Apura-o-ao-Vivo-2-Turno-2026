"use client";

import Link from "next/link";
import { usePatro } from "./TvPatrocinio";

/**
 * Espaço fixo de patrocínio (altura reservada: zero layout shift). Cada espaço mostra sempre o mesmo patrocinador (o de número `indice`), sem rodízio.
 * Vazio, convida para o leilão.
 */
export default function SponsorSlot({ indice = 0, label = "Anuncie aqui", alto = "h-[90px] [@media(max-height:820px)]:h-[64px]" }: { indice?: number; label?: string; alto?: string }) {
  const p = usePatro();
  const src = p.imgs[indice];
  const href = p.links[indice];
  const caixa = `flex ${alto} min-w-0 items-center justify-center overflow-hidden rounded-2xl border`;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    const img = <img src={src} alt={p.texto || `Patrocinador ${indice + 1}`} className="h-full w-full object-contain" />;
    return href ? (
      <a href={href} target="_blank" rel="noopener noreferrer sponsored" className={`${caixa} border-line bg-panel`}>
        {img}
      </a>
    ) : (
      <div className={`${caixa} border-line bg-panel`}>{img}</div>
    );
  }
  return (
    <Link href="/anunciar" rel="sponsored" className={`${caixa} border-dashed border-line px-2 text-center text-xs text-mute hover:text-paper`}>
      {label}
    </Link>
  );
}
