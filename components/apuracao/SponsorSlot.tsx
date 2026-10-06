import { WHATSAPP_COMERCIAL } from "@/lib/env";

/** Espaço reservado (altura fixa): anúncios entram sem empurrar a página (zero layout shift). */
export default function SponsorSlot({ label = "Anuncie aqui" }: { label?: string }) {
  const wa = WHATSAPP_COMERCIAL
    ? `https://wa.me/${WHATSAPP_COMERCIAL}?text=${encodeURIComponent("Olá! Quero anunciar no site de apuração das eleições.")}`
    : "/#anuncie";
  return (
    <a
      href={wa}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="flex h-[90px] items-center [@media(max-height:820px)]:h-[64px] justify-center rounded-2xl border border-dashed border-line text-xs text-mute"
    >
      {label} · patrocínio
    </a>
  );
}
