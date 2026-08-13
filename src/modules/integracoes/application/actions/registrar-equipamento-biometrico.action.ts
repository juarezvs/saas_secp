"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { usuarioPossuiPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  equipamentoBiometricoSchema,
  type EquipamentoBiometricoFormState,
} from "../schemas/integracao.schema";

function extrairDados(formData: FormData) {
  return {
    equipamentoId: String(formData.get("equipamentoId") ?? "").trim(),
    codigo: String(formData.get("codigo") ?? "").trim(),
    nome: String(formData.get("nome") ?? "").trim(),
    orgaoId: String(formData.get("orgaoId") ?? ""),
    unidadeId: String(formData.get("unidadeId") ?? ""),
    fabricante: String(formData.get("fabricante") ?? "").trim(),
    modelo: String(formData.get("modelo") ?? "").trim(),
    numeroSerie: String(formData.get("numeroSerie") ?? "").trim(),
    localizacao: String(formData.get("localizacao") ?? "").trim(),
    ip: String(formData.get("ip") ?? "").trim(),
    porta: String(formData.get("porta") ?? ""),
    protocolo: String(formData.get("protocolo") ?? "GENERIC"),
    usuario: String(formData.get("usuario") ?? "").trim(),
    senha: String(formData.get("senha") ?? ""),
    usuarioDados: String(formData.get("usuarioDados") ?? "").trim(),
    senhaDados: String(formData.get("senhaDados") ?? ""),
    usuarioConfiguracao: String(formData.get("usuarioConfiguracao") ?? "").trim(),
    senhaConfiguracao: String(formData.get("senhaConfiguracao") ?? ""),
    timeoutMs: String(formData.get("timeoutMs") ?? ""),
    proximoNsrColeta: String(formData.get("proximoNsrColeta") ?? ""),
    webhookToken: String(formData.get("webhookToken") ?? "").trim(),
    identificadorCpf:
      formData.get("identificadorCpf") === "on" ||
      formData.get("identificadorCpf") === "true",
    identificadorPis:
      formData.get("identificadorPis") === "on" ||
      formData.get("identificadorPis") === "true",
    identificadorMatriculaComSigla:
      formData.get("identificadorMatriculaComSigla") === "on" ||
      formData.get("identificadorMatriculaComSigla") === "true",
    identificadorMatriculaNumerica:
      formData.get("identificadorMatriculaNumerica") === "on" ||
      formData.get("identificadorMatriculaNumerica") === "true",
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
  };
}

function configuracaoRecord(configuracao: unknown) {
  return configuracao && typeof configuracao === "object"
    ? (configuracao as Record<string, unknown>)
    : {};
}

export async function registrarEquipamentoBiometricoAction(
  _estadoAnterior: EquipamentoBiometricoFormState,
  formData: FormData,
): Promise<EquipamentoBiometricoFormState> {
  const session = await auth();

  if (!session?.user) {
    return {
      sucesso: false,
      mensagem: "Sessao expirada. Faca login novamente.",
    };
  }

  if (
    !usuarioPossuiPermissaoNoPerfil(
      session.user.perfilAtivo?.codigo,
      session.user.perfilAtivo?.permissoes,
      "integracoes:gerenciar:global",
    )
  ) {
    return {
      sucesso: false,
      mensagem: "Voce nao possui permissao para gerenciar integracoes.",
    };
  }

  const dados = extrairDados(formData);
  const parsed = equipamentoBiometricoSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os dados do equipamento.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const equipamentoId = dados.equipamentoId || null;
  const existente = await prisma.equipamentoBiometrico.findUnique({
    where: {
      codigo: parsed.data.codigo,
    },
  });

  if (existente && existente.id !== equipamentoId) {
    return {
      sucesso: false,
      mensagem: "Ja existe um equipamento com este codigo.",
      erros: {
        codigo: ["Ja existe um equipamento com este codigo."],
      },
      campos: dados,
    };
  }

  const escopo = await obterEscopoOrgaoDaSessao();

  try {
    await prisma.$transaction(async (tx) => {
      const equipamentoAtual = equipamentoId
        ? await tx.equipamentoBiometrico.findUnique({
            where: {
              id: equipamentoId,
            },
          })
        : null;

      if (equipamentoId && !equipamentoAtual) {
        throw new Error("Equipamento biometrico nao encontrado para atualizacao.");
      }

      const configAtual = configuracaoRecord(equipamentoAtual?.configuracao);
      const unidade = parsed.data.unidadeId
        ? await tx.unidadeOrganizacional.findUnique({
            where: { id: parsed.data.unidadeId },
            select: { id: true, orgaoId: true },
          })
        : null;

      if (parsed.data.unidadeId && !unidade) {
        throw new Error("Unidade do equipamento nao encontrada.");
      }

      const orgaoId = parsed.data.orgaoId || unidade?.orgaoId || null;

      if (!orgaoId) {
        throw new Error("Vincule o equipamento a um orgao antes de salvar.");
      }

      if (unidade && unidade.orgaoId !== orgaoId) {
        throw new Error("A unidade selecionada nao pertence ao orgao informado.");
      }

      const orgao = await tx.orgao.findUnique({
        where: { id: orgaoId },
        select: { id: true },
      });

      if (!orgao) {
        throw new Error("Orgao do equipamento nao encontrado.");
      }

      if (!escopo.global && !escopo.orgaoIds.includes(orgaoId)) {
        throw new Error("Orgao fora do escopo do perfil ativo.");
      }

      const configEditada = Object.fromEntries(
        Object.entries({
          protocolo: parsed.data.protocolo,
          usuario: parsed.data.usuario || undefined,
          senha: parsed.data.senha || configAtual.senha || undefined,
          usuarioDados: parsed.data.usuarioDados || undefined,
          senhaDados: parsed.data.senhaDados || configAtual.senhaDados || undefined,
          usuarioConfiguracao: parsed.data.usuarioConfiguracao || undefined,
          senhaConfiguracao:
            parsed.data.senhaConfiguracao ||
            configAtual.senhaConfiguracao ||
            undefined,
          timeoutMs:
            typeof parsed.data.timeoutMs === "number"
              ? parsed.data.timeoutMs
              : undefined,
          proximoNsrColeta:
            typeof parsed.data.proximoNsrColeta === "number"
              ? parsed.data.proximoNsrColeta
              : undefined,
          webhookToken: parsed.data.webhookToken || undefined,
          identificadorCpf: parsed.data.identificadorCpf,
          identificadorPis: parsed.data.identificadorPis,
          identificadorMatriculaComSigla:
            parsed.data.identificadorMatriculaComSigla,
          identificadorMatriculaNumerica:
            parsed.data.identificadorMatriculaNumerica,
        }).filter(([, valor]) => valor !== undefined),
      );

      const integracaoAtual = await tx.integracaoSistema.findFirst({
        where: {
          tipo: "EQUIPAMENTO_BIOMETRICO",
          orgaoId,
        },
        select: { id: true },
      });
      const dadosIntegracao = {
        orgaoId,
        nome: "Equipamentos biometricos",
        tipo: "EQUIPAMENTO_BIOMETRICO" as const,
        direcao: "ENTRADA" as const,
        status: "ATIVA" as const,
        ativo: true,
        descricao:
          "Integracao responsavel por receber eventos de equipamentos biometricos da seccional.",
      };
      const integracao = integracaoAtual
        ? await tx.integracaoSistema.update({
            where: { id: integracaoAtual.id },
            data: {
              nome: dadosIntegracao.nome,
              tipo: dadosIntegracao.tipo,
              direcao: dadosIntegracao.direcao,
              status: dadosIntegracao.status,
              ativo: dadosIntegracao.ativo,
              orgaoId: dadosIntegracao.orgaoId,
            },
          })
        : await tx.integracaoSistema.create({
            data: dadosIntegracao,
          });

      if (!integracao) {
        throw new Error("Nao foi possivel preparar a integracao do equipamento.");
      }

      const dadosEquipamento = {
        integracaoId: integracao.id,
        orgaoId,
        codigo: parsed.data.codigo,
        nome: parsed.data.nome,
        unidadeId: unidade?.id ?? null,
        fabricante:
          parsed.data.protocolo === "HENRY" ||
          parsed.data.protocolo === "HENRY_LUMEN_BALCAO" ||
          parsed.data.protocolo === "HENRY_REP_WEB_SERVER"
            ? "HENRY"
            : parsed.data.protocolo === "DIMEP_SMART_PRINT"
              ? "DIMEP"
              : parsed.data.protocolo === "CONTROL_ID_FACE_ID" ||
                  parsed.data.protocolo === "CONTROL_ID_IDCLASS_BIO"
                ? "CONTROL_ID"
                : parsed.data.protocolo === "INTELBRAS_BIO_T"
                  ? "INTELBRAS"
                : parsed.data.fabricante || null,
        modelo: parsed.data.modelo || null,
        numeroSerie: parsed.data.numeroSerie || null,
        localizacao: parsed.data.localizacao || null,
        ip: parsed.data.ip || null,
        porta: typeof parsed.data.porta === "number" ? parsed.data.porta : null,
        ativo: parsed.data.ativo,
        configuracao: {
          ...configAtual,
          ...configEditada,
        } as never,
      };

      const equipamento = equipamentoId
        ? await tx.equipamentoBiometrico.update({
            where: {
              id: equipamentoId,
            },
            data: dadosEquipamento,
          })
        : await tx.equipamentoBiometrico.create({
            data: dadosEquipamento,
          });

      await tx.auditoriaEvento.create({
        data: {
          usuarioId: session.user.id,
          entidade: "EquipamentoBiometrico",
          entidadeId: equipamento.id,
          acao: equipamentoId
            ? "EQUIPAMENTO_BIOMETRICO_ATUALIZADO"
            : "EQUIPAMENTO_BIOMETRICO_CRIADO",
          dadosDepois: {
            id: equipamento.id,
            codigo: equipamento.codigo,
            nome: equipamento.nome,
            unidadeId: equipamento.unidadeId,
            integracaoId: equipamento.integracaoId,
            orgaoId,
            ativo: equipamento.ativo,
          },
        },
      });
    });
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o equipamento.",
      campos: dados,
    };
  }

  revalidatePath("/integracoes");
  revalidatePath("/equipamentos");

  return {
    sucesso: true,
    mensagem: equipamentoId
      ? "Equipamento biometrico atualizado com sucesso."
      : "Equipamento biometrico cadastrado com sucesso.",
  };
}
