import type { Metadata } from "next";
import PainelLeilao from "@/components/admin/PainelLeilao";

export const metadata: Metadata = {
  title: "Leilão de patrocínio",
  robots: { index: false, follow: false, nocache: true },
};

export default function Page() {
  return <PainelLeilao />;
}
