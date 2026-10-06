import { SITE_NAME, SITE_URL } from "@/lib/env";

export const IG_URL = "https://www.instagram.com/leomvideomaker";
export const YT_URL = "https://www.youtube.com/@leomarussobr";
export const DESCRICAO_SITE =
  "Acompanhe a apuração das eleições 2026 em tempo real: placar nacional, mapa por estado e município, governadores, senado, deputados e comparação com 2022. Dados oficiais do TSE.";

export const abs = (path: string) => `${SITE_URL.replace(/\/$/, "")}${path}`;

export type JsonLd = Record<string, unknown>;

/** Dados do site e do autor, usados em todas as páginas. */
export function grafoSite(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": abs("/#site"),
        url: abs("/"),
        name: SITE_NAME,
        inLanguage: "pt-BR",
        description: DESCRICAO_SITE,
        publisher: { "@id": abs("/#autor") },
      },
      {
        "@type": "Organization",
        "@id": abs("/#autor"),
        name: "Marusso Produções",
        url: abs("/"),
        logo: abs("/icons/icon-512.png"),
        sameAs: [IG_URL, YT_URL],
      },
    ],
  };
}

export function breadcrumb(itens: { nome: string; path: string }[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: itens.map((i, n) => ({ "@type": "ListItem", position: n + 1, name: i.nome, item: abs(i.path) })),
  };
}

export function paginaWeb(o: { path: string; nome: string; descricao: string; modificadoEm?: string }): JsonLd {
  return {
    "@type": "WebPage",
    "@id": abs(o.path),
    url: abs(o.path),
    name: o.nome,
    description: o.descricao,
    inLanguage: "pt-BR",
    isPartOf: { "@id": abs("/#site") },
    ...(o.modificadoEm ? { dateModified: o.modificadoEm } : {}),
  };
}

/** Evita que "</script>" ou "<!--" dentro de um texto feche o bloco por engano. */
export function serializar(o: JsonLd): string {
  return JSON.stringify(o).replace(/</g, "\\u003c");
}
