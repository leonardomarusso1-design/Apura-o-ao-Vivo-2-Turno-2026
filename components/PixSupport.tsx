import QRCode from "qrcode";
import CopyButton from "./CopyButton";
import { PIX_COPIA_COLA } from "@/lib/env";

export default async function PixSupport() {
  if (!PIX_COPIA_COLA) return null;
  const qr = await QRCode.toDataURL(PIX_COPIA_COLA, { margin: 1, width: 220, errorCorrectionLevel: "M" });
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <h2 className="font-display text-2xl">Apoie o site</h2>
      <p className="mt-1 text-sm text-mute">
        Gratuito para todos. Se quiser ajudar a pagar servidor e banda no dia da apuração, use o Pix abaixo.
        É apoio ao projeto, <strong className="text-paper">não é doação a candidato, partido ou campanha</strong>.
      </p>
      <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} width={160} height={160} alt="QR Code Pix para apoiar o site" className="rounded-lg bg-white p-1" />
        <CopyButton text={PIX_COPIA_COLA} label="Copiar Pix copia e cola" />
      </div>
    </section>
  );
}
