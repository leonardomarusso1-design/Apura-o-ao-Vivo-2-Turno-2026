import type { Metadata } from "next";
import { EMAIL_COMERCIAL } from "@/lib/env";

export const metadata: Metadata = { title: "Política de privacidade", alternates: { canonical: "/privacidade" } };

export default function Privacidade() {
  return (
    <main id="conteudo" className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed text-paper/90">
      <h1 className="font-display text-3xl">Política de privacidade</h1>
      <p className="mt-4">
        Coletamos e-mail, nome (opcional) e WhatsApp (opcional) somente para avisar você sobre a apuração do 2º turno e
        novidades deste site, com base no seu consentimento (LGPD, art. 7º, I).
      </p>
      <p className="mt-3">
        Guardamos também um identificador técnico do seu acesso (hash do IP, sem o IP original) para evitar abuso.
        Não perguntamos nem armazenamos em quem você vota. Não vendemos nem compartilhamos sua lista de contatos com
        anunciantes.
      </p>
      <p className="mt-3">
        Quem dá um lance no leilão de patrocínio (página Anunciar) informa empresa, nome, e-mail e WhatsApp. Usamos esses dados apenas para falar com os
        vencedores sobre pagamento e arte, e não os mostramos a ninguém.
      </p>
      <p className="mt-3">
        Você pode sair a qualquer momento pelo link presente em todas as mensagens, ou pedindo a exclusão dos seus dados
        em {EMAIL_COMERCIAL || "nosso e-mail de contato"}.
      </p>
      <p className="mt-3">
        Usamos métricas agregadas e anônimas de acesso (quantidade de pessoas online) para exibir audiência.
      </p>
      {process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_GTM_ID ? (
        <p className="mt-3">
          Também usamos o Google Analytics para medir o uso do site (páginas vistas, aparelho, cidade aproximada e cliques em botões). O Google pode gravar
          cookies para isso. Anúncios e personalização ficam desligados, e esses dados não são ligados ao seu e-mail ou WhatsApp. Você pode bloquear esses
          cookies no navegador.
        </p>
      ) : null}
      <p className="mt-6">
        <a href="/" className="underline">
          Voltar
        </a>
      </p>
    </main>
  );
}
