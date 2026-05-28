import { prisma } from "@/shared/infrastructure/database/prisma";

export async function registrarHeartbeatEquipamento(params: {
  equipamentoCodigo: string;
  payload?: unknown;
}) {
  const equipamento = await prisma.equipamentoBiometrico.findUnique({
    where: {
      codigo: params.equipamentoCodigo,
    },
  });

  if (!equipamento) {
    throw new Error("Equipamento biométrico não cadastrado.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.equipamentoBiometrico.update({
      where: {
        id: equipamento.id,
      },
      data: {
        ultimoHeartbeatEm: new Date(),
      },
    });

    await tx.eventoEquipamentoBiometrico.create({
      data: {
        equipamentoId: equipamento.id,
        tipoEvento: "HEARTBEAT",
        processado: true,
        processadoEm: new Date(),
        payload: params.payload ?? undefined,
      },
    });
  });

  return {
    sucesso: true,
  };
}
