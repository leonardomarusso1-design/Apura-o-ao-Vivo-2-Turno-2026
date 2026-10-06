import { PIX_PAYLOAD } from "@/lib/pix";
import PixCopiaBotao from "./PixCopiaBotao";

export default function PixSupport() {
  if (!PIX_PAYLOAD) return null;
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <h2 className="font-display text-2xl">Ajude a manter o site no ar</h2>
      <p className="mt-1 text-sm text-mute">
        O site é gratuito. Se quiser ajudar a pagar servidor e banda no dia da apuração, use o Pix.
        É apoio ao projeto e <strong className="text-paper">não é doação a candidato, partido ou campanha</strong>.
      </p>
      <div className="mt-4">
        <PixCopiaBotao />
      </div>
    </section>
  );
}
