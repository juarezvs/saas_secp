import { auth } from "@/auth";
import { NextResponse } from "next/server";

const rotasPublicas = ["/login", "/"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const usuarioAutenticado = Boolean(req.auth?.user);

  const rotaPublica = rotasPublicas.some((rota) => pathname.startsWith(rota));

  if (!usuarioAutenticado && !rotaPublica) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.href);

    return NextResponse.redirect(url);
  }

  if (usuarioAutenticado && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Protege tudo, exceto:
     * - API auth
     * - arquivos estáticos
     * - imagens
     * - favicon
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
