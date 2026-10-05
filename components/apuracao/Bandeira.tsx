/* eslint-disable @next/next/no-img-element */
import { BR_UFS } from "@/lib/br-map";

/** Bandeira de estado (uf) ou país (iso). Arquivos pequenos (≈3 KB) em /public/flags, carregados só quando aparecem. */
export default function Bandeira({
  uf,
  iso,
  w = 28,
  ring,
  className = "",
}: {
  uf?: string;
  iso?: string;
  w?: number;
  ring?: string;
  className?: string;
}) {
  const ufOk = uf && BR_UFS.some((u) => u.id.toUpperCase() === uf.toUpperCase());
  const src = ufOk ? `/flags/uf/${uf!.toLowerCase()}.webp` : iso && /^[a-z]{2}$/i.test(iso) ? `/flags/pais/${iso.toLowerCase()}.webp` : null;
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      width={w}
      height={Math.round(w * 0.7)}
      loading="lazy"
      decoding="async"
      className={`inline-block shrink-0 rounded-[3px] object-cover ${className}`}
      style={{ width: w, height: Math.round(w * 0.7), boxShadow: ring ? `0 0 0 2px ${ring}` : "0 0 0 1px #232b28" }}
    />
  );
}
