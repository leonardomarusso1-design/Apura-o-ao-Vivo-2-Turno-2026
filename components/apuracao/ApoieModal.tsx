"use client";

import { useEffect } from "react";
import CopyButton from "../CopyButton";

/** Janela com o QR do Pix (apoio ao site, não é doação a candidato/partido/campanha). */
export default function ApoieModal({ aberto, onClose, qr, pix }: { aberto: boolean; onClose: () => void; qr: string; pix: string }) {
  useEffect(() => {
    if (!aberto) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [aberto, onClose]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Apoie o site">
      <div className="glass-panel-elevated w-full max-w-sm rounded-2xl border border-white/10 p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl">Ajude a manter o site no ar</h2>
        <p className="mt-1 text-sm text-mute">
          Gratuito para todos. Se quiser ajudar a pagar servidor e banda no dia da apuração, use o Pix.{" "}
          <strong className="text-paper">Não é doação a candidato, partido ou campanha.</strong>
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} width={200} height={200} alt="QR Code Pix para apoiar o site" className="mx-auto mt-4 rounded-lg bg-white p-1.5" />
        <div className="mt-3 flex justify-center">
          <CopyButton text={pix} label="Copiar Pix copia e cola" />
        </div>
        <button onClick={onClose} className="mt-4 h-9 rounded-xl border border-line px-4 text-sm hover:bg-white/5">
          Fechar
        </button>
      </div>
    </div>
  );
}
