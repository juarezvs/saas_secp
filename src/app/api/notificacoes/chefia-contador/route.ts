import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { contarNotificacoesPerfilChefiaUsuario } from "@/modules/notificacoes/application/notificacoes.service";

async function getNotificacoesChefiaContador(request: Request) {
  void request;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ total: 0, perfilCodigo: null }, { status: 401 });
  }

  if (session.user.perfilAtivo?.codigo?.toUpperCase() !== "SERVIDOR") {
    return NextResponse.json(
      { total: 0, perfilCodigo: null },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const resultado = await contarNotificacoesPerfilChefiaUsuario({
    usuarioId: session.user.id,
    perfis: session.user.perfis,
    perfilAtivo: session.user.perfilAtivo,
  });

  return NextResponse.json(
    {
      total: resultado.total,
      perfilCodigo: resultado.perfilChefia?.codigo ?? null,
      perfilNome: resultado.perfilChefia?.nome ?? null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export const GET = withHttpMetrics(
  "/api/notificacoes/chefia-contador",
  getNotificacoesChefiaContador,
);
