import { imagemPlacar, OG_SIZE } from "@/lib/og/placar";

export const revalidate = 60;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Placar da apuração das eleições 2026";

export default function Image() {
  return imagemPlacar(1);
}
