import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { removerCache } from "@/lib/cache/redis-cache";
import { withHttpMetrics } from "@/lib/observability/http";
import {
  PREFERENCIAS_ACESSIBILIDADE_PADRAO,
  normalizarPreferenciasAcessibilidade,
} from "@/modules/auth/application/services/preferencias-acessibilidade.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

async function getAcessibilidade() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({
      preferencias: PREFERENCIAS_ACESSIBILIDADE_PADRAO,
    });
  }

  const usuario = await prisma.usuario.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      preferenciasAcessibilidade: true,
    },
  });

  return NextResponse.json({
    preferencias: normalizarPreferenciasAcessibilidade(
      usuario?.preferenciasAcessibilidade,
    ),
  });
}

async function putAcessibilidade(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const usuario = await prisma.usuario.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      preferenciasAcessibilidade: true,
    },
  });
  const preferenciasAtuais =
    usuario?.preferenciasAcessibilidade &&
    typeof usuario.preferenciasAcessibilidade === "object" &&
    !Array.isArray(usuario.preferenciasAcessibilidade)
      ? usuario.preferenciasAcessibilidade
      : {};
  const preferenciasRecebidas =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
  const preferencias = normalizarPreferenciasAcessibilidade({
    ...preferenciasAtuais,
    ...preferenciasRecebidas,
  });

  await prisma.usuario.update({
    where: {
      id: session.user.id,
    },
    data: {
      preferenciasAcessibilidade: preferencias,
    },
  });

  if (session.user.matricula) {
    await removerCache(
      `secp:auth:usuario:${session.user.matricula.trim().toUpperCase()}`,
    );
  }

  return NextResponse.json({ preferencias }, { status: 200 });
}

export const GET = withHttpMetrics(
  "/api/sessao/acessibilidade",
  getAcessibilidade,
);
export const PUT = withHttpMetrics(
  "/api/sessao/acessibilidade",
  putAcessibilidade,
);
