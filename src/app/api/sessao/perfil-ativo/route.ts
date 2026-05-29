import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  PERFIL_ATIVO_COOKIE,
  PERFIL_ATIVO_COOKIE_MAX_AGE_SEGUNDOS,
} from "@/modules/auth/domain/constants/perfil-ativo-cookie";
import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";

type UsuarioSessaoComPerfis = {
  perfis?: PerfilSessao[];
};

type TrocarPerfilAtivoPayload = {
  perfilCodigo?: string;
};

export async function POST(request: Request) {
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

  const usuarioSessao = session.user as UsuarioSessaoComPerfis;
  const perfis = usuarioSessao.perfis ?? [];
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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PERFIL_ATIVO_COOKIE_MAX_AGE_SEGUNDOS,
  });

  return response;
}
