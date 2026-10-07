import Link from "next/link";

export default function Sponsors() {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <p className="text-[11px] uppercase tracking-widest text-amber">Para marcas</p>
      <h2 className="mt-1 font-display text-2xl">Sua marca na apuração mais acompanhada do dia</h2>
      <p className="mt-2 text-sm text-mute">
        O número de pessoas aguardando, no topo desta página, é real e atualizado ao vivo, e é a audiência que verá seu anúncio no dia 25. São poucas cotas,
        vendidas em leilão: quem der o maior lance fica com o espaço, que passa no site inteiro e no Modo TV.
      </p>
      <div className="mt-4">
        <Link href="/anunciar" className="inline-flex h-12 items-center justify-center rounded-xl bg-amber px-5 font-semibold text-ink">
          Anunciar e dar lance
        </Link>
      </div>
    </section>
  );
}
