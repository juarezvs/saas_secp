"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { registrarAuditoriaEvento } from "@/modules/auditoria/application/services/registrar-auditoria.service";
import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { validarAssinaturaDocumento } from "@/modules/documentos-autenticacao/application/services/validar-assinatura-documento.service";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  PERMISSOES_ACOMPANHAMENTO_ESTAGIO,
  carregarAcompanhamentoEstagio,
  carregarAcompanhamentoEstagioPorServidor,
  dataReferenciaUtc,
  normalizarCompetenciaEstagio,
} from "../services/acompanhamento-estagio.service";

export type AcompanhamentoEstagioActionState = {
  erro: string | null;
  sucesso: string | null;
};

const estadoInicial: AcompanhamentoEstagioActionState = {
  erro: null,
  sucesso: null,
};

export async function salvarAcompanhamentoEstagioAction(
  _state: AcompanhamentoEstagioActionState = estadoInicial,
  formData: FormData,
): Promise<AcompanhamentoEstagioActionState> {
  void _state;

  try {
    const permissao = await exigirPermissao(
      PERMISSOES_ACOMPANHAMENTO_ESTAGIO.preencher,
    );
    const { ano, mes } = normalizarCompetenciaEstagio({
      competencia: String(formData.get("competencia") ?? ""),
      anoReferencia: formData.get("anoReferencia")?.toString(),
      mesReferencia: formData.get("mesReferencia")?.toString(),
    });
    const dados = await carregarAcompanhamentoEstagio({
      usuarioId: permissao.usuarioId ?? "",
      ano,
      mes,
    });

    if (!dados) {
      return {
        erro: "Acompanhamento mensal disponível apenas para estagiários ativos.",
        sucesso: null,
      };
    }

    if (
      dados.acompanhamento.status === "AGUARDANDO_SUPERVISOR" ||
      dados.acompanhamento.status === "FECHADO"
    ) {
      return {
        erro: "Competência já assinada. Não é possível alterar as atividades.",
        sucesso: null,
      };
    }

    const curso = textoOpcional(formData.get("curso"));
    const supervisor = textoOpcional(formData.get("supervisor"));
    const linhasEditaveis = dados.linhas.filter((linha) => linha.editavel);

    await prisma.$transaction(async (tx) => {
      const acompanhamento = await tx.acompanhamentoEstagioMensal.upsert({
        where: {
          servidorId_anoReferencia_mesReferencia: {
            servidorId: dados.servidor.id,
            anoReferencia: ano,
            mesReferencia: mes,
          },
        },
        update: {
          curso,
          supervisor,
        },
        create: {
          servidorId: dados.servidor.id,
          anoReferencia: ano,
          mesReferencia: mes,
          curso,
          supervisor,
        },
      });

      for (const linha of linhasEditaveis) {
        const atividades = textoObrigatorioOuVazio(
          formData.get(`atividade:${linha.dataIso}`),
        );

        await tx.acompanhamentoEstagioDia.upsert({
          where: {
            acompanhamentoId_dataReferencia: {
              acompanhamentoId: acompanhamento.id,
              dataReferencia: dataReferenciaUtc(linha.dataIso),
            },
          },
          update: {
            atividades,
            minutosRegistrados: linha.minutosRegistrados,
            metadados: {
              marcacoes: linha.marcacoes,
            },
          },
          create: {
            acompanhamentoId: acompanhamento.id,
            dataReferencia: dataReferenciaUtc(linha.dataIso),
            atividades,
            minutosRegistrados: linha.minutosRegistrados,
            metadados: {
              marcacoes: linha.marcacoes,
            },
          },
        });
      }

      await registrarAuditoriaEvento({
        tx,
        usuarioId: permissao.usuarioId,
        entidade: "AcompanhamentoEstagioMensal",
        entidadeId: acompanhamento.id,
        acao: "SALVAR_ACOMPANHAMENTO_ESTAGIO",
        metadados: {
          anoReferencia: ano,
          mesReferencia: mes,
          servidorId: dados.servidor.id,
          linhasEditaveis: linhasEditaveis.length,
        },
      });
    });

    revalidatePath("/acompanhamento-estagio");
    revalidatePath("/acompanhamento-estagio/consulta");

    return {
      erro: null,
      sucesso: "Atividades salvas com sucesso.",
    };
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o acompanhamento.",
      sucesso: null,
    };
  }
}

export async function fecharAcompanhamentoEstagioAction(
  _state: AcompanhamentoEstagioActionState = estadoInicial,
  formData: FormData,
): Promise<AcompanhamentoEstagioActionState> {
  void _state;

  try {
    const session = await auth();

    if (!session?.user) {
      return {
        erro: "Sessão expirada. Faça login novamente.",
        sucesso: null,
      };
    }

    const permissao = await exigirPermissao(
      PERMISSOES_ACOMPANHAMENTO_ESTAGIO.preencher,
    );
    const { ano, mes } = normalizarCompetenciaEstagio({
      competencia: String(formData.get("competencia") ?? ""),
      anoReferencia: formData.get("anoReferencia")?.toString(),
      mesReferencia: formData.get("mesReferencia")?.toString(),
    });

    const dados = await carregarAcompanhamentoEstagio({
      usuarioId: permissao.usuarioId ?? "",
      ano,
      mes,
    });

    if (!dados) {
      return {
        erro: "Acompanhamento mensal disponível apenas para estagiários ativos.",
        sucesso: null,
      };
    }

    if (dados.acompanhamento.status === "AGUARDANDO_SUPERVISOR") {
      return {
        erro: null,
        sucesso: "Competência já enviada ao supervisor.",
      };
    }

    if (dados.acompanhamento.status === "FECHADO") {
      return {
        erro: null,
        sucesso: "Competência já estava fechada.",
      };
    }

    const linhasSemAtividade = dados.linhas.filter(
      (linha) => !linha.atividades.trim(),
    );

    if (linhasSemAtividade.length > 0) {
      return {
        erro: `Preencha as atividades dos dias com marcação antes de fechar: ${linhasSemAtividade
          .map((linha) => linha.dataLabel)
          .join(", ")}.`,
        sucesso: null,
      };
    }

    const senha = String(formData.get("senhaAssinatura") ?? "");
    const assinatura = await validarAssinaturaDocumento({
      session,
      senha,
    });
    const assinaturaJson = {
      usuarioId: assinatura.usuarioId,
      matricula: assinatura.matricula,
      nome: assinatura.nome,
      assinadoEm: assinatura.assinadoEm.toISOString(),
    };

    await prisma.$transaction(async (tx) => {
      const acompanhamento = await tx.acompanhamentoEstagioMensal.upsert({
        where: {
          servidorId_anoReferencia_mesReferencia: {
            servidorId: dados.servidor.id,
            anoReferencia: ano,
            mesReferencia: mes,
          },
        },
        update: {
          status: "AGUARDANDO_SUPERVISOR",
          fechadoPorId: permissao.usuarioId,
          fechadoEm: new Date(),
          assinatura: assinaturaJson,
          supervisorAssinadoPorId: null,
          supervisorAssinadoEm: null,
          assinaturaSupervisor: Prisma.JsonNull,
          devolucaoJustificativa: null,
        },
        create: {
          servidorId: dados.servidor.id,
          anoReferencia: ano,
          mesReferencia: mes,
          curso: dados.acompanhamento.curso || null,
          supervisor: dados.acompanhamento.supervisor || null,
          status: "AGUARDANDO_SUPERVISOR",
          fechadoPorId: permissao.usuarioId,
          fechadoEm: new Date(),
          assinatura: assinaturaJson,
        },
      });

      await registrarAuditoriaEvento({
        tx,
        usuarioId: permissao.usuarioId,
        entidade: "AcompanhamentoEstagioMensal",
        entidadeId: acompanhamento.id,
        acao: "ENVIAR_ACOMPANHAMENTO_ESTAGIO_SUPERVISOR",
        metadados: {
          anoReferencia: ano,
          mesReferencia: mes,
          servidorId: dados.servidor.id,
          matricula: dados.servidor.matricula,
        },
      });
    });

    revalidatePath("/acompanhamento-estagio");
    revalidatePath("/acompanhamento-estagio/consulta");

    return {
      erro: null,
      sucesso: "Competência assinada e enviada ao supervisor.",
    };
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a competência.",
      sucesso: null,
    };
  }
}

export async function assinarSupervisorAcompanhamentoEstagioAction(
  _state: AcompanhamentoEstagioActionState = estadoInicial,
  formData: FormData,
): Promise<AcompanhamentoEstagioActionState> {
  void _state;

  try {
    const session = await auth();

    if (!session?.user) {
      return {
        erro: "Sessão expirada. Faça login novamente.",
        sucesso: null,
      };
    }

    const permissao = await exigirPermissao(
      PERMISSOES_ACOMPANHAMENTO_ESTAGIO.supervisionar,
    );
    const { ano, mes } = normalizarCompetenciaEstagio({
      competencia: String(formData.get("competencia") ?? ""),
      anoReferencia: formData.get("anoReferencia")?.toString(),
      mesReferencia: formData.get("mesReferencia")?.toString(),
    });
    const servidorId = String(formData.get("servidorId") ?? "");
    const dados = await carregarAcompanhamentoEstagioPorServidor({
      servidorId,
      usuarioId: permissao.usuarioId ?? "",
      ano,
      mes,
      modo: "SUPERVISOR",
    });

    if (!dados) {
      return {
        erro: "Acompanhamento não encontrado no escopo da supervisão.",
        sucesso: null,
      };
    }

    if (dados.acompanhamento.status !== "AGUARDANDO_SUPERVISOR") {
      return {
        erro: "A competência só pode ser assinada após a assinatura do estagiário.",
        sucesso: null,
      };
    }

    const senha = String(formData.get("senhaAssinaturaSupervisor") ?? "");
    const assinatura = await validarAssinaturaDocumento({
      session,
      senha,
    });
    const assinaturaJson = {
      usuarioId: assinatura.usuarioId,
      matricula: assinatura.matricula,
      nome: assinatura.nome,
      assinadoEm: assinatura.assinadoEm.toISOString(),
    };

    await prisma.$transaction(async (tx) => {
      const acompanhamento = await tx.acompanhamentoEstagioMensal.update({
        where: {
          servidorId_anoReferencia_mesReferencia: {
            servidorId: dados.servidor.id,
            anoReferencia: ano,
            mesReferencia: mes,
          },
        },
        data: {
          status: "FECHADO",
          supervisorAssinadoPorId: permissao.usuarioId,
          supervisorAssinadoEm: new Date(),
          assinaturaSupervisor: assinaturaJson,
          devolucaoJustificativa: null,
        },
      });

      await registrarAuditoriaEvento({
        tx,
        usuarioId: permissao.usuarioId,
        entidade: "AcompanhamentoEstagioMensal",
        entidadeId: acompanhamento.id,
        acao: "ASSINAR_SUPERVISOR_ACOMPANHAMENTO_ESTAGIO",
        metadados: {
          anoReferencia: ano,
          mesReferencia: mes,
          servidorId: dados.servidor.id,
          matricula: dados.servidor.matricula,
        },
      });
    });

    revalidatePath("/acompanhamento-estagio");
    revalidatePath("/acompanhamento-estagio/consulta");

    return {
      erro: null,
      sucesso: "Competência assinada pelo supervisor.",
    };
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : "Não foi possível assinar a competência.",
      sucesso: null,
    };
  }
}

export async function devolverSupervisorAcompanhamentoEstagioAction(
  _state: AcompanhamentoEstagioActionState = estadoInicial,
  formData: FormData,
): Promise<AcompanhamentoEstagioActionState> {
  void _state;

  try {
    const permissao = await exigirPermissao(
      PERMISSOES_ACOMPANHAMENTO_ESTAGIO.supervisionar,
    );
    const { ano, mes } = normalizarCompetenciaEstagio({
      competencia: String(formData.get("competencia") ?? ""),
      anoReferencia: formData.get("anoReferencia")?.toString(),
      mesReferencia: formData.get("mesReferencia")?.toString(),
    });
    const servidorId = String(formData.get("servidorId") ?? "");
    const justificativa = textoObrigatorioOuVazio(
      formData.get("justificativaDevolucao"),
    );

    if (!justificativa) {
      return {
        erro: "Informe a justificativa da devolução.",
        sucesso: null,
      };
    }

    const dados = await carregarAcompanhamentoEstagioPorServidor({
      servidorId,
      usuarioId: permissao.usuarioId ?? "",
      ano,
      mes,
      modo: "SUPERVISOR",
    });

    if (!dados) {
      return {
        erro: "Acompanhamento não encontrado no escopo da supervisão.",
        sucesso: null,
      };
    }

    if (dados.acompanhamento.status !== "AGUARDANDO_SUPERVISOR") {
      return {
        erro: "A competência só pode ser devolvida quando estiver aguardando o supervisor.",
        sucesso: null,
      };
    }

    await prisma.$transaction(async (tx) => {
      const acompanhamento = await tx.acompanhamentoEstagioMensal.update({
        where: {
          servidorId_anoReferencia_mesReferencia: {
            servidorId: dados.servidor.id,
            anoReferencia: ano,
            mesReferencia: mes,
          },
        },
        data: {
          status: "DEVOLVIDO",
          assinatura: Prisma.JsonNull,
          fechadoPorId: null,
          fechadoEm: null,
          supervisorAssinadoPorId: null,
          supervisorAssinadoEm: null,
          assinaturaSupervisor: Prisma.JsonNull,
          devolucaoJustificativa: justificativa,
        },
      });

      await registrarAuditoriaEvento({
        tx,
        usuarioId: permissao.usuarioId,
        entidade: "AcompanhamentoEstagioMensal",
        entidadeId: acompanhamento.id,
        acao: "DEVOLVER_ACOMPANHAMENTO_ESTAGIO",
        metadados: {
          anoReferencia: ano,
          mesReferencia: mes,
          servidorId: dados.servidor.id,
          matricula: dados.servidor.matricula,
          justificativa,
        },
      });
    });

    revalidatePath("/acompanhamento-estagio");
    revalidatePath("/acompanhamento-estagio/consulta");

    return {
      erro: null,
      sucesso: "Competência devolvida para ajustes.",
    };
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : "Não foi possível devolver a competência.",
      sucesso: null,
    };
  }
}

function textoOpcional(valor: FormDataEntryValue | null) {
  const texto = valor?.toString().trim();
  return texto || null;
}

function textoObrigatorioOuVazio(valor: FormDataEntryValue | null) {
  return valor?.toString().trim() ?? "";
}
