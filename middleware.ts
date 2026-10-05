import { NextResponse, type NextRequest } from "next/server";

/**
 * Quem já se cadastrou (cookie apr_ok) cai direto na apuração, sem passar pela tela de espera.
 * Para ver a página inicial mesmo assim (ex.: indicar um amigo): /?ver=1
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  if (url.pathname === "/" && req.cookies.get("apr_ok")?.value === "1" && !url.searchParams.has("ver")) {
    const to = url.clone();
    to.pathname = "/apuracao";
    to.search = "";
    return NextResponse.redirect(to, 307); // 307 (temporário): nunca é guardado como definitivo
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
