"use client";

import { useState } from "react";

/** Busca o Pix no servidor só quando a pessoa pede (o código não fica no HTML da página). */
export default function PixCopiaBotao() {
  const [st, setSt] = useState<"idle" | "carregando" | "ok" | "erro">("idle");
  const [qr, setQr] = useState<string | null>(null);

  async function abrir() {
    setSt("carregando");
    try {
      const r = await fetch("/api/pix", { cache: "no-store" });
      const j = (await r.json()) as { ok: boolean; pix?: string; qr?: string };
      if (!j.ok || !j.pix) throw new Error("pix");
      setQr(j.qr ?? null);
      try {
        await navigator.clipboard.writeText(j.pix);
        setSt("ok");
      } catch {
        setSt("ok");
      }
    } catch {
      setSt("erro");
    }
  }

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <button type="button" onClick={abrir} disabled={st === "carregando"} className="h-11 rounded-xl border border-line px-4 text-sm">
        {st === "ok" ? "Código copiado" : st === "carregando" ? "Gerando..." : "Mostrar QR e copiar Pix"}
      </button>
      {st === "erro" ? <span className="text-xs text-mute">Não deu certo agora. Tente de novo em instantes.</span> : null}
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} width={160} height={160} alt="QR Code Pix para apoiar o site" className="rounded-lg bg-white p-1" />
      ) : null}
    </div>
  );
}
