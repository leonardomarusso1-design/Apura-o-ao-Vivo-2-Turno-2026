import type { Metadata } from "next";
import PaginaApuracao from "@/components/apuracao/PaginaApuracao";

export const metadata: Metadata = {
  title: "Apuração ao vivo do 2º turno 2026",
  description: "Placar, mapa por estado e município, governadores e atualizações da apuração do 2º turno em tempo real. Dados oficiais do TSE.",
  alternates: { canonical: "/apuracao/2" },
  openGraph: { url: "/apuracao/2", title: "Apuração ao vivo do 2º turno 2026", type: "website", locale: "pt_BR" },
};
export const revalidate = 10;

export default function Page() {
  return <PaginaApuracao turno={2} />;
}
