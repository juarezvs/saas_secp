import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const rotasPublicas = ["/login"];
const cookiesSessao = ["__Secure-authjs.session-token", "authjs.session-token"];

function possuiCookieSessao(req: NextRequest) {
  return req.cookies.getAll().some((cookie) => {
    if (!cookie.value) {
      return false;
    }

    return (
      cookiesSessao.includes(cookie.name) ||
      cookiesSessao.some((nome) => cookie.name.startsWith(`${nome}.`))
    );
  });
}

function origemPublica(req: NextRequest) {
  const protocolo = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("host") ?? req.nextUrl.host;

  return `${protocolo}://${host}`;
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const usuarioAutenticado = possuiCookieSessao(req);

  const rotaPublica =
    pathname === "/" || rotasPublicas.some((rota) => pathname.startsWith(rota));

  if (!usuarioAutenticado && !rotaPublica) {
    const origem = origemPublica(req);
    const url = new URL("/login", origem);
    const callbackUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, origem);
    url.searchParams.set("callbackUrl", callbackUrl.href);

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protege tudo, exceto:
     * - API auth
     * - sondas de observabilidade
     * - arquivos estáticos
     * - imagens
     * - favicon
     * - assets públicos com extensão (png, css, js, etc.)
     */
    "/((?!api/auth|api/metrics|api/health|api/ready|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
