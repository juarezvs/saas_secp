import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { normalizarPreferenciasAcessibilidade } from "@/modules/auth/application/services/preferencias-acessibilidade.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const preferencias = normalizarPreferenciasAcessibilidade(payload);

  await prisma.usuario.update({
    where: {
      id: session.user.id,
    },
    data: {
      preferenciasAcessibilidade: preferencias,
    },
  });

  return NextResponse.json({ preferencias }, { status: 200 });
}
