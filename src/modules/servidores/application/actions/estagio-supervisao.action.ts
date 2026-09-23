"use server";

import { revalidatePath } from "next/cache";

import { registrarAuditoriaEvento } from "@/modules/auditoria/application/services/registrar-auditoria.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type EstagioSupervisaoState = {
  erro: string | null;
  sucesso: string | null;
};

const estadoInicial: EstagioSupervisaoState = {
  erro: null,
  sucesso: null,
};

export async function registrarSupervisaoEstagioAction(
  estagiarioServidorId: string,
  _state: EstagioSupervisaoState = estadoInicial,
  formData: FormData,
): Promise<EstagioSupervisaoState> {
  void _state;

  try {
    const permissao = await exigirPermissaoOuRedirecionar(
      "servidores:gerenciar:global",
    );
    const supervisorServidorId = String(
      formData.get("supervisorServidorId") ?? "",
    );
    const curso = textoOpcional(formData.get("curso"));
    const observacao = textoOpcional(formData.get("observacao"));
    const dataInicio = normalizarData(formData.get("dataInicio"));

    if (!supervisorServidorId || !dataInicio) {
      return {
        erro: "Informe supervisor e data de inicio.",
        sucesso: null,
      };
    }

    const [estagiario, supervisor] = await Promise.all([
      prisma.servidor.findUnique({
        where: { id: estagiarioServidorId },
        include: { usuario: true, categoriaPessoa: true },
      }),
      prisma.servidor.findUnique({
        where: { id: supervisorServidorId },
        include: { usuario: true },
      }),
    ]);

    const categoria = estagiario?.categoriaPessoa?.codigo?.toUpperCase();
    if (
      !estagiario ||
      (estagiario.usuario.tipo !== "ESTAGIARIO" && categoria !== "ESTAGIARIO")
    ) {
      return {
        erro: "A supervisao de estagio so pode ser cadastrada para estagiarios.",
        sucesso: null,
      };
    }

    if (!supervisor || !supervisor.ativo) {
      return {
        erro: "Supervisor nao encontrado ou inativo.",
        sucesso: null,
      };
    }

    const dataFimAnterior = new Date(dataInicio);
    dataFimAnterior.setUTCDate(dataFimAnterior.getUTCDate() - 1);

    await prisma.$transaction(async (tx) => {
      await tx.estagioSupervisao.updateMany({
        where: {
          estagiarioServidorId,
          dataFim: null,
        },
        data: {
          dataFim: dataFimAnterior,
        },
      });

      const supervisao = await tx.estagioSupervisao.create({
        data: {
          estagiarioServidorId,
          supervisorServidorId,
          curso,
          observacao,
          dataInicio,
          criadoPorUsuarioId: permissao.usuarioId,
        },
      });

      await registrarAuditoriaEvento({
        tx,
        usuarioId: permissao.usuarioId,
        entidade: "EstagioSupervisao",
        entidadeId: supervisao.id,
        acao: "REGISTRAR_SUPERVISAO_ESTAGIO",
        metadados: {
          estagiarioServidorId,
          supervisorServidorId,
          curso,
          dataInicio: dataInicio.toISOString(),
        },
      });
    });

    revalidatePath(`/servidores/${estagiarioServidorId}`);
    revalidatePath("/acompanhamento-estagio");
    revalidatePath("/acompanhamento-estagio/consulta");

    return {
      erro: null,
      sucesso: "Supervisao de estagio registrada.",
    };
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : "Nao foi possivel registrar a supervisao.",
      sucesso: null,
    };
  }
}

function textoOpcional(valor: FormDataEntryValue | null) {
  const texto = valor?.toString().trim();
  return texto || null;
}

function normalizarData(valor: FormDataEntryValue | null) {
  const texto = valor?.toString();

  if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return null;
  }

  const [ano, mes, dia] = texto.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}
