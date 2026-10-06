import type { Metadata } from "next";
import JsonLdScript from "@/components/JsonLdScript";
import { SITE_NAME } from "@/lib/env";
import { abs, breadcrumb, paginaWeb } from "@/lib/seo";

const TITULO = "Perguntas frequentes sobre a apuração 2026";
const DESC = "Respostas curtas sobre a origem dos dados, o horário da apuração, a projeção e o Mural do site. Os números vêm do TSE.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  alternates: { canonical: "/apuracao/perguntas" },
  openGraph: { url: "/apuracao/perguntas", title: TITULO, description: DESC, type: "article", locale: "pt_BR" },
};
export const dynamic = "force-static";

const PERGUNTAS: { q: string; a: string }[] = [
  {
    q: "De onde vêm os números da apuração?",
    a: "Do TSE. O site lê os arquivos de divulgação de resultados que o tribunal publica e reorganiza os dados em placar, mapa e listas. Quando o TSE ainda não publicou algo, a tela mostra que está aguardando em vez de inventar um valor. Este é um projeto independente, sem vínculo com o TSE, partidos, candidatos ou campanhas.",
  },
  {
    q: "A que horas a apuração do 2º turno começa?",
    a: "A votação do 2º turno é no domingo, 25 de outubro de 2026, e termina às 17h no horário de Brasília. Os primeiros resultados aparecem depois do fechamento das urnas, no ritmo em que o TSE totaliza as seções. Antes disso, a página do 2º turno mostra a contagem regressiva e o Mural.",
  },
  {
    q: "Com que frequência a página atualiza?",
    a: "Sozinha, a cada poucos segundos, enquanto o TSE publicar dados novos. Você não precisa recarregar. A barra de tempo no rodapé mostra quando foi a última leitura.",
  },
  {
    q: "Como posso conferir os números?",
    a: "No portal Resultados do TSE (resultados.tse.jus.br). Na tela de apuração há um link de conferência e, abaixo do placar, a data, a hora e o número da geração do arquivo do TSE que foi lido. Se o TSE publicar uma geração mais nova, o portal pode mostrar números um pouco diferentes por alguns instantes até o site atualizar.",
  },
  {
    q: "Este site é oficial do TSE?",
    a: "Não. É uma plataforma independente que apresenta os dados que o TSE disponibiliza para divulgação. Não há vínculo com o tribunal, com partidos, candidatos ou campanhas.",
  },
  {
    q: "Qual a diferença entre totalização e resultado final?",
    a: "Totalização é a soma dos boletins de urna conforme chegam ao TSE, e por isso o percentual de seções apuradas sobe durante a noite. O resultado final só existe quando as seções estão totalizadas e o TSE marca o candidato como eleito. Antes disso, quem está na frente apenas lidera a contagem.",
  },
  {
    q: "O que é a projeção?",
    a: "É uma estimativa calculada pelo site a partir das seções já apuradas. Ela muda conforme entram regiões novas e deixa de aparecer quando a apuração chega perto de 100%. Não é resultado oficial e pode errar, principalmente no começo da noite.",
  },
  {
    q: "Esse resultado é oficial?",
    a: "O resultado oficial é o que o TSE divulga em resultados.tse.jus.br. O site mostra os mesmos dados com uma apresentação diferente. Em caso de diferença, vale o número do TSE.",
  },
  {
    q: "Onde vejo o resultado do 1º turno?",
    a: "Na página do 1º turno, que continua no ar com presidente, governadores, senado e deputados. Dá para trocar entre 1º e 2º turno no topo da tela.",
  },
  {
    q: "O que é o Mural?",
    a: "Um espaço com dois corações (verde e vermelho) e uma pergunta sobre onde você está assistindo: TV, celular ou computador. Cada pessoa tem um coração e uma resposta. O site soma os corações e não divulga o resultado por cor. O Mural não pergunta nem mostra intenção de voto em candidato.",
  },
  {
    q: "O site guarda em quem eu votei?",
    a: "Não. O site não pergunta isso. Quem se cadastra para receber aviso informa e-mail e, se quiser, WhatsApp. Os detalhes estão na política de privacidade.",
  },
  {
    q: "Como ajudar a manter o site no ar?",
    a: "Pelo botão Apoie, no topo da tela de apuração, que abre um Pix. O valor ajuda a pagar servidor e banda no dia da eleição e não é doação a candidato, partido ou campanha.",
  },
];

export default function Perguntas() {
  const faq = {
    "@context": "https://schema.org",
    "@graph": [
      paginaWeb({ path: "/apuracao/perguntas", nome: TITULO, descricao: DESC }),
      breadcrumb([
        { nome: SITE_NAME, path: "/" },
        { nome: "Apuração", path: "/apuracao/2" },
        { nome: "Perguntas frequentes", path: "/apuracao/perguntas" },
      ]),
      {
        "@type": "FAQPage",
        "@id": abs("/apuracao/perguntas#faq"),
        mainEntity: PERGUNTAS.map((p) => ({ "@type": "Question", name: p.q, acceptedAnswer: { "@type": "Answer", text: p.a } })),
      },
    ],
  };
  return (
    <main id="conteudo" className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <JsonLdScript dados={faq} />
      <p className="text-[11px] uppercase tracking-widest text-lime">{SITE_NAME}</p>
      <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{TITULO}</h1>
      <div className="mt-8 grid gap-7">
        {PERGUNTAS.map((p) => (
          <section key={p.q}>
            <h2 className="text-lg font-semibold">{p.q}</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-paper/85">{p.a}</p>
          </section>
        ))}
      </div>
      <p className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href="/apuracao/2" className="inline-flex min-h-11 items-center underline">
          Ver a apuração do 2º turno
        </a>
        <a href="/apuracao/1" className="inline-flex min-h-11 items-center underline">
          Ver o 1º turno
        </a>
        <a href="/privacidade" className="inline-flex min-h-11 items-center underline">
          Política de privacidade
        </a>
      </p>
    </main>
  );
}
