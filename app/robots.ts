import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

const IA = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot"];

export default function robots(): MetadataRoute.Robots {
  const base = { allow: ["/", "/llms.txt"], disallow: ["/api/", "/sair"] };
  return {
    rules: [{ userAgent: "*", ...base }, { userAgent: IA, ...base }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
