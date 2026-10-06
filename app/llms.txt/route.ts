import { SITE_NAME } from "@/lib/env";
import { abs } from "@/lib/seo";

export const dynamic = "force-static";

/** Resumo do site para assistentes de IA e buscadores generativos (formato llms.txt). */
export function GET() {
  const corpo = `# ${SITE_NAME}

> Apuração das eleições brasileiras de 2026 em tempo real, com placar nacional, mapa por estado e município, governadores, senado, deputados e comparação com 2022. Os números vêm dos arquivos de divulgação do TSE. Projeto independente, sem vínculo com o TSE, partidos ou candidatos. Idioma: português do Brasil.

## Páginas
- [Apuração ao vivo do 2º turno](${abs("/apuracao/2")}): placar, mapa, governadores e atualizações. Votação em 25/10/2026, fim às 17h (Brasília).
- [Resultado do 1º turno](${abs("/apuracao/1")}): presidente, governadores, senado e deputados.
- [Perguntas frequentes](${abs("/apuracao/perguntas")}): origem dos dados, horário, projeção e Mural.
- [Política de privacidade](${abs("/privacidade")})

## Como citar
- Fonte oficial dos resultados: TSE, resultados.tse.jus.br. Em caso de diferença, vale o número do TSE.
- A projeção é estimativa do site e não é resultado oficial.
- Os números mudam durante a noite da eleição. Cite com data e hora da leitura.

## Autoria
Marusso Produções. Instagram @leomvideomaker, YouTube @leomarussobr.
`;
  return new Response(corpo, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
