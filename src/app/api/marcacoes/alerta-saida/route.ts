import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { obterAlertaSaidaEstimadaUsuario } from "@/modules/marcacoes/application/services/alerta-saida-estimada.service";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ ativo: false }, { status: 401 });
  }

  const alerta = await obterAlertaSaidaEstimadaUsuario(session.user.id);

  return NextResponse.json(alerta, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

