import type { Metadata } from "next";
import PaginaApuracao from "@/components/apuracao/PaginaApuracao";

export const metadata: Metadata = {
  title: { absolute: "Apuração 2º turno 2026 AO VIVO: resultado da eleição para presidente" },
  description: "Quem está ganhando agora? Resultado da eleição para presidente ao vivo: placar, mapa por estado e município, projeção e governadores, atualizando sozinho. Dados oficiais do TSE.",
  alternates: { canonical: "/apuracao/2" },
  openGraph: { url: "/apuracao/2", title: "Apuração 2º turno 2026 AO VIVO: resultado da eleição para presidente", type: "website", locale: "pt_BR" },
};
export const revalidate = 10;

export default function Page() {
  return <PaginaApuracao turno={2} />;
}
