import type { Metadata } from "next";
import { EMAIL_COMERCIAL, SITE_NAME } from "@/lib/env";

export const metadata: Metadata = { title: `Privacidade — ${SITE_NAME}` };

export default function Privacidade() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed text-paper/90">
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
        Você pode sair a qualquer momento pelo link presente em todas as mensagens, ou pedindo a exclusão dos seus dados
        em {EMAIL_COMERCIAL || "nosso e-mail de contato"}.
      </p>
      <p className="mt-3">
        Usamos métricas agregadas e anônimas de acesso (quantidade de pessoas online) para exibir audiência.
      </p>
      <p className="mt-6">
        <a href="/" className="underline">
          Voltar
        </a>
      </p>
    </main>
  );
}
