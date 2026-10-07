import type { MetadataRoute } from "next";
import { abs } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: abs("/"), lastModified: agora, changeFrequency: "daily", priority: 1 },
    { url: abs("/apuracao/2"), lastModified: agora, changeFrequency: "always", priority: 0.9 },
    { url: abs("/apuracao/1"), lastModified: agora, changeFrequency: "weekly", priority: 0.6 },
    { url: abs("/apuracao/perguntas"), changeFrequency: "monthly", priority: 0.5 },
    { url: abs("/anunciar"), changeFrequency: "monthly", priority: 0.3 },
    { url: abs("/jogo"), changeFrequency: "monthly", priority: 0.3 },
    { url: abs("/privacidade"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
