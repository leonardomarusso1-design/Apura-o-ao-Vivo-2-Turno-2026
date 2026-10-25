import type { Metadata } from "next";
import PainelChat from "@/components/admin/PainelChat";

export const metadata: Metadata = {
  title: "Moderação do chat",
  robots: { index: false, follow: false, nocache: true },
};

export default function Page() {
  return <PainelChat />;
}
