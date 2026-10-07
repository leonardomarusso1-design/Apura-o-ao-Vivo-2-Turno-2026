import SponsorSlot from "../apuracao/SponsorSlot";

/** Sem AdSense: o espaço é de patrocínio direto (vendido em leilão em /anunciar). Mantém a assinatura antiga para não mexer nas telas. */
export default function AdSlot({ label }: { slot?: string; height?: number; label?: string }) {
  return <SponsorSlot label={label} />;
}
