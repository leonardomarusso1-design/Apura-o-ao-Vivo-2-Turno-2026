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
  const pre = `${b.titulo}. ${b.texto}`.slice(0, 110);
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${b.assunto}</title></head>
<body style="margin:0;padding:0;background:#0b0f0d;font-family:Arial,Helvetica,sans-serif;color:#f4f4ee">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0b0f0d">${pre}&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f0d"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px">
<tr><td style="padding:0 4px 14px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c6f24e;font-weight:700">&#9679; ${SITE_NAME}</td></tr>
<tr><td style="background:#141a17;border:1px solid #243029;border-radius:20px;padding:34px 30px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8fa096;padding-bottom:12px">2º turno &middot; 25 de outubro</td></tr>
<tr><td style="font-size:30px;line-height:1.15;font-weight:800;color:#ffffff;padding-bottom:14px">${b.titulo}</td></tr>
<tr><td style="font-size:16px;line-height:1.6;color:#cfd8d2;padding-bottom:26px">${oi} ${b.texto}</td></tr>
<tr><td><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#c6f24e" style="border-radius:12px"><a href="${url}" style="display:inline-block;padding:16px 28px;font-size:16px;font-weight:800;color:#0a0d0c;text-decoration:none;border-radius:12px">${b.cta} &rarr;</a></td></tr></table></td></tr>
<tr><td style="padding-top:22px;font-size:13px;line-height:1.5;color:#8fa096">Ou copie o link: <a href="${url}" style="color:#c6f24e;text-decoration:none">${SITE_URL.replace(/^https?:\/\//, "")}/apuracao</a></td></tr>
</table></td></tr>
<tr><td style="padding:20px 6px 0;font-size:12px;line-height:1.6;color:#6f7f76;text-align:center">Voc&ecirc; recebeu este e-mail porque pediu para ser avisado em ${SITE_URL.replace(/^https?:\/\//, "")}.<br><a href="${sairUrl}" style="color:#8fa096">Sair da lista</a><br><br>Marusso Produ&ccedil;&otilde;es 2026 &middot; @leomvideomaker &middot; @leomarussobr</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: b.assunto, html, text, unsubscribeUrl: sairUrl };
}

export function whatsappText(kind: Kind, c: Ctx) {
  const b = CORPO[kind];
  const oi = first(c.name) ? `Olá, ${first(c.name)}!` : "Olá!";
  return `${oi} ${b.titulo}. ${b.texto}\n\n${link("whatsapp")}\n\nPara não receber mais avisos: ${sair(c.unsubToken)}`;
}
