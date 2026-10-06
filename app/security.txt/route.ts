import { EMAIL_COMERCIAL } from "@/lib/env";
import { abs } from "@/lib/seo";

export const dynamic = "force-static";

/** Servido em /.well-known/security.txt por rewrite (ver next.config.ts). */
export function GET() {
  const contato = EMAIL_COMERCIAL ? `mailto:${EMAIL_COMERCIAL}` : abs("/privacidade");
  const corpo = `Contact: ${contato}
Expires: 2027-10-05T00:00:00.000Z
Preferred-Languages: pt, en
Canonical: ${abs("/.well-known/security.txt")}
`;
  return new Response(corpo, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
