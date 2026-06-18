import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { contarNotificacoesUsuario } from "@/modules/notificacoes/application/notificacoes.service";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ total: 0 }, { status: 401 });
  }

  const total = await contarNotificacoesUsuario(session.user.id);

  return NextResponse.json(
    { total },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
