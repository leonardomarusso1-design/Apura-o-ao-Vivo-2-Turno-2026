import type { Metadata } from "next";
import PainelPatro from "@/components/admin/PainelPatro";

export const metadata: Metadata = {
  title: "Patrocínio da transmissão",
  robots: { index: false, follow: false, nocache: true },
};

export default function Page() {
  return <PainelPatro />;
}
