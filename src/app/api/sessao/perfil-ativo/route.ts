import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import {
  PERFIL_ATIVO_COOKIE,
  PERFIL_ATIVO_COOKIE_MAX_AGE_SEGUNDOS,
} from "@/modules/auth/domain/constants/perfil-ativo-cookie";
import { buscarUsuarioParaLoginPorMatricula } from "@/modules/auth/infrastructure/repositories/usuario-auth.repository";

type TrocarPerfilAtivoPayload = {
  perfilCodigo?: string;
};

function cookieSeguroEmProducao() {
  const urlPublica = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";

  try {
    return new URL(urlPublica).protocol === "https:";
  } catch {
    return false;
  }
}

async function postPerfilAtivo(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | TrocarPerfilAtivoPayload
    | null;

  if (!payload?.perfilCodigo) {
    return NextResponse.json(
      { message: "Informe o código do perfil." },
      { status: 400 },
    );
  }

  const usuarioAtual = await buscarUsuarioParaLoginPorMatricula(
    session.user.matricula,
  );
  const perfis = usuarioAtual?.perfis ?? [];
  const perfilAtivo = perfis.find(
    (perfil) => perfil.codigo === payload.perfilCodigo,
  );

  if (!perfilAtivo) {
    return NextResponse.json(
      { message: "O perfil informado não pertence ao usuário autenticado." },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ perfilAtivo }, { status: 200 });

  response.cookies.set({
    name: PERFIL_ATIVO_COOKIE,
    value: perfilAtivo.codigo,
    httpOnly: true,
    secure: cookieSeguroEmProducao(),
    sameSite: "lax",
    path: "/",
    maxAge: PERFIL_ATIVO_COOKIE_MAX_AGE_SEGUNDOS,
  });

  return response;
}

export const POST = withHttpMetrics("/api/sessao/perfil-ativo", postPerfilAtivo);
