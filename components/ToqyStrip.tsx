/** Faixa fixa (altura constante => sem layout shift) divulgando o TOQY, projeto do dono do site. */
export default function ToqyStrip() {
  return (
    <a
      href="https://toqy.com.br/?utm_source=apuracao&utm_medium=faixa&utm_campaign=2turno"
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 items-center justify-center gap-2 bg-lime px-3 text-center text-[13px] font-semibold text-ink"
    >
      <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime">TOQY</span>
      <span className="truncate">Seu link na bio e cartão digital profissional, prontos em minutos →</span>
    </a>
  );
}
