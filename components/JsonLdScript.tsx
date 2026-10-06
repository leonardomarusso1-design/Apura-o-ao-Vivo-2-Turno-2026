import { serializar, type JsonLd } from "@/lib/seo";

export default function JsonLdScript({ dados }: { dados: JsonLd }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializar(dados) }} />;
}
