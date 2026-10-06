import type { Metadata } from "next";
import PaginaApuracao from "@/components/apuracao/PaginaApuracao";

export const metadata: Metadata = {
  title: "Resultado do 1º turno 2026",
  description: "Resultado do 1º turno: presidente, governadores, senado e deputados, com mapas por estado e município. Dados oficiais do TSE.",
  alternates: { canonical: "/apuracao/1" },
  openGraph: { url: "/apuracao/1", title: "Resultado do 1º turno 2026", type: "website", locale: "pt_BR" },
};
export const revalidate = 60;

export default function Page() {
  return <PaginaApuracao turno={1} />;
}
