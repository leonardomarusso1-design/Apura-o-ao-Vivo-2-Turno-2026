import type { Metadata } from "next";
import AnunciarForm from "@/components/AnunciarForm";
import Credito from "@/components/Credito";
import { COTAS, ENCERRA_ISO, LANCE_MIN } from "@/lib/leilao";

export const metadata: Metadata = {
  title: "Anunciar na apuração · leilão de cotas",
  description: "Sua marca passando no site e no Modo TV da apuração do 2º turno das eleições 2026. Cotas vendidas em leilão.",
  alternates: { canonical: "/anunciar" },
};

export default function Anunciar() {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <p className="text-[11px] uppercase tracking-widest text-amber">Para marcas</p>
      <h1 className="mt-1 font-display text-3xl sm:text-4xl">Anuncie na apuração do 2º turno</h1>
      <p className="mt-3 text-mute">
        Sua marca passa no site inteiro e no Modo TV, durante toda a apuração. Como a audiência chega de uma vez quando a contagem começa, as cotas são vendidas
        em leilão, com lances até poucas horas antes. São {COTAS} cotas: ficam com elas os {COTAS} maiores lances.
      </p>

      <div className="mt-6">
        <AnunciarForm inicial={{ encerra: ENCERRA_ISO, cotas: COTAS, minimo: LANCE_MIN }} />
      </div>

      <section className="mt-8 grid gap-3 text-sm leading-relaxed text-mute">
        <h2 className="font-display text-xl text-paper">Como funciona</h2>
        <p>1. Você dá seu lance aqui. Pode aumentar até o encerramento, usando o mesmo e-mail. O valor dos outros lances não aparece, só o mínimo para entrar.</p>
        <p>2. Quando os lances encerram, entramos em contato com os vencedores pelo WhatsApp e pelo e-mail que você deixar, para combinar o pagamento. Não há pagamento neste site.</p>
        <p>3. Com o pagamento confirmado, você envia a arte (imagem horizontal 1200 x 400 px, PNG ou JPG) e colocamos no ar antes da apuração começar.</p>
        <p>
          Não aceitamos anúncios de candidatos, partidos, coligações ou qualquer propaganda eleitoral, nem conteúdo ilegal ou enganoso. Reservamo-nos o direito de
          recusar uma arte. O site é independente e não tem vínculo com o TSE, partidos ou campanhas.
        </p>
      </section>

      <p className="mt-10 text-xs text-mute">
        <Credito />
      </p>
    </main>
  );
}
