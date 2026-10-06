import type { Metadata } from "next";
import PaginaApuracao from "@/components/apuracao/PaginaApuracao";
import { SITE_NAME } from "@/lib/env";

export const metadata: Metadata = {
  title: `Resultado do 1º turno 2026 — ${SITE_NAME}`,
  description: "Resultado final do 1º turno: presidente, governadores, senado e deputados, com mapas por estado e município. Dados oficiais do TSE.",
};
export const revalidate = 60;

export default function Page() {
  return <PaginaApuracao turno={1} />;
}
