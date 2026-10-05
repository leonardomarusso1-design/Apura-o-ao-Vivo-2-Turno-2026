import { EMAIL_COMERCIAL, WHATSAPP_COMERCIAL } from "@/lib/env";

export default function Sponsors() {
  const wa = WHATSAPP_COMERCIAL
    ? `https://wa.me/${WHATSAPP_COMERCIAL}?text=${encodeURIComponent("Olá! Quero saber como patrocinar a apuração do 2º turno.")}`
    : null;
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <p className="text-[11px] uppercase tracking-widest text-amber">Para marcas</p>
      <h2 className="mt-1 font-display text-2xl">Sua marca na apuração mais acompanhada do dia</h2>
      <p className="mt-2 text-sm text-mute">
        O número de pessoas aguardando, no topo desta página, é real e atualizado ao vivo — e é a audiência que verá
        seu anúncio no dia 25. Cotas limitadas, com espaço reservado (sem pulos de layout).
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center rounded-xl bg-amber px-5 font-semibold text-ink">
            Falar no WhatsApp
          </a>
        ) : null}
        {EMAIL_COMERCIAL ? (
          <a href={`mailto:${EMAIL_COMERCIAL}`} className="inline-flex h-12 items-center justify-center rounded-xl border border-line px-5 text-sm">
            {EMAIL_COMERCIAL}
          </a>
        ) : null}
      </div>
    </section>
  );
}
