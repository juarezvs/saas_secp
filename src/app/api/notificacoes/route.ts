import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  listarNotificacoesPendentesUsuario,
  listarNotificacoesUsuario,
  marcarNotificacaoComoLida,
} from "@/modules/notificacoes/application/notificacoes.service";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ notificacoes: [] }, { status: 401 });
  }

  const apenasPendentes = new URL(request.url).searchParams.get("chat") === "1";
  const contexto = {
    perfilAtivo: session.user.perfilAtivo,
  };
  const notificacoes = apenasPendentes
    ? await listarNotificacoesPendentesUsuario(session.user.id, contexto)
    : await listarNotificacoesUsuario(session.user.id, contexto);

  return NextResponse.json(
    {
      notificacoes: notificacoes.map((notificacao) => ({
        ...notificacao,
        criadoEm: notificacao.criadoEm.toISOString(),
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = (await request.json()) as { notificacaoId?: string };
  const notificacaoId = payload.notificacaoId?.trim();

  if (!notificacaoId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await marcarNotificacaoComoLida(session.user.id, notificacaoId);

  return NextResponse.json({ ok: true });
}
