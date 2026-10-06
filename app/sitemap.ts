import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/apuracao/2`, changeFrequency: "always", priority: 0.9 },
    { url: `${SITE_URL}/apuracao/1`, changeFrequency: "daily", priority: 0.6 },
  ];
}
