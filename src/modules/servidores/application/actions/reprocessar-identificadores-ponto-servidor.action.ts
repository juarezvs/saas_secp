"use server";

import { revalidatePath } from "next/cache";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { vincularMarcacoesBrutasServidorService } from "@/modules/marcacoes-brutas/application/services/vincular-marcacoes-brutas-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ReprocessarIdentificadoresPontoServidorState = {
  sucesso: boolean;
  mensagem: string | null;
  total?: number;
  processadas?: number;
  aindaPendentes?: number;
  erros?: number;
};

export async function reprocessarIdentificadoresPontoServidorAction(
  servidorId: string,
  estadoAnterior: ReprocessarIdentificadoresPontoServidorState,
): Promise<ReprocessarIdentificadoresPontoServidorState> {
  void estadoAnterior;

  const permissao = await exigirPermissaoOuRedirecionar(
    "servidores:gerenciar:global",
  );

  const servidor = await prisma.servidor.findUnique({
    where: {
      id: servidorId,
    },
    select: {
      id: true,
      matricula: true,
      cpf: true,
      pis: true,
      identificadoresPonto: {
        where: {
          ativo: true,
        },
        select: {
          valor: true,
        },
        orderBy: [{ principal: "desc" }, { criadoEm: "asc" }],
      },
    },
  });

  if (!servidor) {
    return {
      sucesso: false,
      mensagem: "Pessoa não encontrada.",
    };
  }

  const resultado = await vincularMarcacoesBrutasServidorService({
    servidorId,
    cpf: servidor.cpf,
    pis: servidor.pis,
    matricula: servidor.matricula,
    identificadores: servidor.identificadoresPonto.map(
      (identificador) => identificador.valor,
    ),
    usuarioIdAuditoria: permissao.usuarioId,
  });

  revalidatePath("/marcacoes-brutas");
  revalidatePath(`/servidores/${servidorId}`);

  return {
    sucesso: resultado.erros === 0,
    mensagem:
      resultado.total === 0
        ? "Nenhuma marcação bruta pendente foi encontrada para estes identificadores."
        : `${resultado.processadas} de ${resultado.total} marcações brutas pendentes foram processadas pelos identificadores de ponto.`,
    total: resultado.total,
    processadas: resultado.processadas,
    aindaPendentes: resultado.aindaPendentes,
    erros: resultado.erros,
  };
}
