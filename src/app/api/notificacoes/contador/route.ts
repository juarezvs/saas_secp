import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { contarNotificacoesUsuario } from "@/modules/notificacoes/application/notificacoes.service";

async function getNotificacoesContador(request: Request) {
  void request;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ total: 0 }, { status: 401 });
  }

  const total = await contarNotificacoesUsuario(session.user.id, {
    perfilAtivo: session.user.perfilAtivo,
  });

  return NextResponse.json(
    { total },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export const GET = withHttpMetrics(
  "/api/notificacoes/contador",
  getNotificacoesContador,
);
