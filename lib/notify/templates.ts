import { SITE_NAME, SITE_URL } from "@/lib/env";

export type Kind = "lembrete" | "inicio" | "resultado";
export const KINDS: Kind[] = ["lembrete", "inicio", "resultado"];

type Ctx = { name: string | null; unsubToken: string };

const first = (n: string | null) => (n ? n.split(" ")[0] : null);
const link = (src: string) => `${SITE_URL}/apuracao?utm_source=${src}`;
const sair = (t: string) => `${SITE_URL}/sair?t=${t}`;

const CORPO: Record<Kind, { assunto: string; titulo: string; texto: string; cta: string }> = {
  lembrete: {
    assunto: "Amanhã: apuração do 2º turno ao vivo",
    titulo: "A apuração é amanhã",
    texto: "As urnas fecham às 17h (Brasília). Guarde o link: a apuração acontece ao vivo, com mapa, projeção e atualizações.",
    cta: "Ver a página da apuração",
  },
  inicio: {
    assunto: "Começou: apuração do 2º turno ao vivo",
    titulo: "A apuração começou",
    texto: "Os primeiros resultados do 2º turno já estão sendo divulgados pelo TSE. Acompanhe ao vivo.",
    cta: "Acompanhar agora",
  },
  resultado: {
    assunto: "Apuração encerrada: veja o resultado",
    titulo: "A apuração terminou",
    texto: "O TSE concluiu a divulgação. Veja o resultado completo, estado por estado.",
    cta: "Ver o resultado",
  },
};

export function emailContent(kind: Kind, c: Ctx) {
  const b = CORPO[kind];
  const oi = first(c.name) ? `Olá, ${first(c.name)}!` : "Olá!";
  const url = link("email");
  const sairUrl = sair(c.unsubToken);
  const text = `${oi}\n\n${b.titulo}. ${b.texto}\n\n${b.cta}: ${url}\n\nVocê recebeu isto porque pediu aviso em ${SITE_URL}. Para sair da lista: ${sairUrl}`;
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f3f1ea;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;padding:28px">
<tr><td style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#5a7a00">${SITE_NAME} · 2º turno</td></tr>
<tr><td style="font-size:26px;font-weight:700;padding:10px 0 6px">${b.titulo}</td></tr>
<tr><td style="font-size:16px;line-height:1.5;color:#333;padding-bottom:20px">${oi} ${b.texto}</td></tr>
<tr><td><a href="${url}" style="display:inline-block;background:#c6f24e;color:#0a0d0c;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:10px">${b.cta}</a></td></tr>
<tr><td style="font-size:12px;color:#777;padding-top:24px;line-height:1.5">Você recebeu este e-mail porque pediu para ser avisado em ${SITE_URL}.<br><a href="${sairUrl}" style="color:#777">Sair da lista</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: b.assunto, html, text, unsubscribeUrl: sairUrl };
}

export function whatsappText(kind: Kind, c: Ctx) {
  const b = CORPO[kind];
  const oi = first(c.name) ? `Olá, ${first(c.name)}!` : "Olá!";
  return `${oi} ${b.titulo}. ${b.texto}\n\n${link("whatsapp")}\n\nPara não receber mais avisos: ${sair(c.unsubToken)}`;
}
