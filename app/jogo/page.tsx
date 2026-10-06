import type { Metadata } from "next";
import Link from "next/link";
import Jogo from "@/components/jogo/Jogo";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  title: "Jogo da espera: atire nos blocos e desvie das bombas",
  description: "Um joguinho rápido para jogar enquanto a apuração não começa. Atire nos blocos vermelhos e verdes, desvie de bombas e caixas e ganhe estrelas.",
  alternates: { canonical: `${SITE_URL}/jogo` },
};

export default function Page() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center gap-3 px-4 py-4">
      <div className="flex w-full items-center justify-between text-sm">
        <Link href="/apuracao/2" className="text-mute hover:text-paper">
          ← Voltar à apuração
        </Link>
        <span className="font-display text-lg">Jogo da espera</span>
      </div>
      <Jogo />
      <p className="text-center text-xs leading-relaxed text-mute">
        Arraste o dedo (ou use as setas) para mover. O tiro é automático. Blocos vermelhos e verdes valem o mesmo: é só um jogo, sem
        relação com candidatos.
      </p>
    </main>
  );
}
