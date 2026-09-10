import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import {
  adicionarFavoritoUsuarioPerfil,
  listarFavoritosUsuarioPerfil,
  removerFavoritoUsuarioPerfil,
} from "@/modules/favoritos/application/favoritos-usuario-perfil.service";

function perfilAtivoDaSessao(session: Session | null) {
  return session?.user.perfilAtivo
    ? {
        id: session.user.perfilAtivo.id,
        permissoes: session.user.perfilAtivo.permissoes,
      }
    : null;
}

export async function GET() {
  const session = await auth();
  const perfil = perfilAtivoDaSessao(session);

  if (!session?.user || !perfil) {
    return NextResponse.json({ favoritos: [] }, { status: 401 });
  }

  const favoritos = await listarFavoritosUsuarioPerfil({
    usuarioId: session.user.id,
    perfil,
  });

  return NextResponse.json({ favoritos });
}

export async function POST(request: Request) {
  const session = await auth();
  const perfil = perfilAtivoDaSessao(session);

  if (!session?.user || !perfil) {
    return NextResponse.json(
      { message: "Sessao expirada." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    itemCatalogo?: string;
  } | null;
  const itemCatalogo = body?.itemCatalogo?.trim();

  if (!itemCatalogo) {
    return NextResponse.json(
      { message: "Item de menu nao informado." },
      { status: 400 },
    );
  }

  try {
    const favorito = await adicionarFavoritoUsuarioPerfil({
      usuarioId: session.user.id,
      perfil,
      itemCatalogo,
    });

    return NextResponse.json({ favorito });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel favoritar a funcionalidade.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  const perfil = perfilAtivoDaSessao(session);

  if (!session?.user || !perfil) {
    return NextResponse.json(
      { message: "Sessao expirada." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    itemCatalogo?: string;
  } | null;
  const itemCatalogo = body?.itemCatalogo?.trim();

  if (!itemCatalogo) {
    return NextResponse.json(
      { message: "Item de menu nao informado." },
      { status: 400 },
    );
  }

  await removerFavoritoUsuarioPerfil({
    usuarioId: session.user.id,
    perfilId: perfil.id,
    itemCatalogo,
  });

  return NextResponse.json({ ok: true });
}
