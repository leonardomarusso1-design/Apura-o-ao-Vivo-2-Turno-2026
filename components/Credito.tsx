const IG = "https://www.instagram.com/leomvideomaker";
const YT = "https://www.youtube.com/@leomarussobr";

/** Assinatura do site. `compact` = versão curta para o cabeçalho. */
export default function Credito({ compact = false }: { compact?: boolean }) {
  const cls = "underline decoration-line underline-offset-2 hover:text-paper";
  return (
    <span className="text-xs text-mute">
      by <strong className="font-semibold text-paper">Marusso Produções</strong> 2026
      {compact ? null : (
        <>
          {" "}
          ·{" "}
          <a href={IG} target="_blank" rel="noopener noreferrer" className={cls}>
            Instagram @leomvideomaker
          </a>{" "}
          ·{" "}
          <a href={YT} target="_blank" rel="noopener noreferrer" className={cls}>
            YouTube @leomarussobr
          </a>
        </>
      )}
    </span>
  );
}
