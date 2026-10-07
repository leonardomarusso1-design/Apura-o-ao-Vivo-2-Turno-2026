"use client";

import Link from "next/link";
import { Carrossel, usePatro } from "./TvPatrocinio";

/** Espaço reservado (altura fixa): os patrocinadores passam aqui, um a um, sem empurrar a página (zero layout shift). Vazio, convida para o leilão. */
export default function SponsorSlot({ label = "Anuncie aqui" }: { label?: string }) {
  const p = usePatro();
  const caixa = "flex h-[90px] [@media(max-height:820px)]:h-[64px] items-center justify-center rounded-2xl border";
  if (p.imgs.length) {
    return (
      <div className={`${caixa} overflow-hidden border-line bg-panel`} aria-label="Patrocinadores">
        <Carrossel imgs={p.imgs} links={p.links} seg={p.seg} alt={p.texto || "Patrocinador"} />
      </div>
    );
  }
  return (
    <Link href="/anunciar" rel="sponsored" className={`${caixa} border-dashed border-line text-xs text-mute hover:text-paper`}>
      {label} · dê seu lance
    </Link>
  );
}
