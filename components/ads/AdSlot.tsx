import SponsorSlot from "../apuracao/SponsorSlot";

/** Sem AdSense: o espaço é de patrocínio direto, vendido em leilão em /anunciar. `indice` escolhe qual dos 4 patrocinadores aparece. */
export default function AdSlot({ label, indice = 0, alto }: { slot?: string; height?: number; label?: string; indice?: number; alto?: string }) {
  return <SponsorSlot label={label} indice={indice} alto={alto} />;
}
