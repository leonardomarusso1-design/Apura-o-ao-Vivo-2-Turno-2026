import type { Metadata } from "next";
import PaginaApuracao from "@/components/apuracao/PaginaApuracao";
import { SITE_NAME } from "@/lib/env";

export const metadata: Metadata = {
  title: `Apuração ao vivo do 2º turno — ${SITE_NAME}`,
  description: "Mapa, placar, projeção e atualizações da apuração do 2º turno em tempo real, com dados oficiais do TSE.",
};
export const revalidate = 10;

export default function Page() {
  return <PaginaApuracao turno={2} />;
}
