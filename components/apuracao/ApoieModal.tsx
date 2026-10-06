"use client";

import { useEffect, useState } from "react";

/** Janela com o QR do Pix (apoio ao site, não é doação a candidato/partido/campanha). O código vem do servidor ao abrir. */
export default function ApoieModal({ aberto, onClose }: { aberto: boolean; onClose: () => void }) {
  const [d, setD] = useState<{ pix: string; qr: string } | null>(null);
  const [erro, setErro] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [aberto, onClose]);

  useEffect(() => {
    if (!aberto || d) return;
    let vivo = true;
    setErro(false);
    fetch("/api/pix", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ ok: boolean; pix?: string; qr?: string }>)
      .then((j) => {
        if (!vivo) return;
        if (j.ok && j.pix && j.qr) setD({ pix: j.pix, qr: j.qr });
        else setErro(true);
      })
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [aberto, d]);

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Apoie o site">
      <div className="glass-panel-elevated w-full max-w-sm rounded-2xl border border-white/10 p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl">Ajude a manter o site no ar</h2>
        <p className="mt-1 text-sm text-mute">
          O site é gratuito. Se quiser ajudar a pagar servidor e banda no dia da apuração, use o Pix.{" "}
          <strong className="text-paper">Não é doação a candidato, partido ou campanha.</strong>
        </p>
        {d ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.qr} width={200} height={200} alt="QR Code Pix para apoiar o site" className="mx-auto mt-4 rounded-lg bg-white p-1.5" />
        ) : (
          <div className="mx-auto mt-4 flex h-[200px] w-[200px] items-center justify-center rounded-lg bg-white/5 text-xs text-mute">
            {erro ? "Não foi possível carregar agora." : "Gerando QR..."}
          </div>
        )}
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            disabled={!d}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(d!.pix);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              } catch {
                /* ignore */
              }
            }}
            className="h-11 rounded-xl border border-line px-4 text-sm disabled:opacity-50"
          >
            {copiado ? "Copiado!" : "Copiar Pix copia e cola"}
          </button>
        </div>
        <button onClick={onClose} className="mt-4 h-11 rounded-xl border border-line px-4 text-sm hover:bg-white/5">
          Fechar
        </button>
      </div>
    </div>
  );
}
