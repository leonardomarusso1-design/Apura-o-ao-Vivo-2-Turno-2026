import type { Metadata } from "next";
import PainelSlot from "@/components/admin/PainelSlot";

export const metadata: Metadata = {
  title: "Espaço do mapa",
  robots: { index: false, follow: false, nocache: true },
};

export default function Page() {
  return <PainelSlot />;
}
