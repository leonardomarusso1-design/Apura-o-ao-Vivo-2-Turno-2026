export default function ToqyCard() {
  return (
    <a
      href="https://toqy.com.br/?utm_source=apuracao&utm_medium=card&utm_campaign=2turno"
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl border border-lime/50 bg-panel p-4 transition hover:border-lime lg:px-3 lg:py-2.5"
    >
      <p className="text-[10px] uppercase tracking-widest text-lime">Feito pelo criador deste site</p>
      <p className="mt-1 font-display text-2xl leading-tight lg:text-lg">TOQY <span className="hidden text-xs font-normal text-mute lg:inline">crie seu link na bio e cartão digital →</span></p>
      <p className="mt-1 text-sm text-mute lg:hidden">
        Crie seu link na bio e seu cartão digital profissional, com editor visual, em poucos minutos.
      </p>
      <span className="mt-3 inline-flex h-10 items-center rounded-xl bg-lime px-4 text-sm font-semibold text-ink lg:hidden">
        Conhecer o TOQY →
      </span>
    </a>
  );
}
