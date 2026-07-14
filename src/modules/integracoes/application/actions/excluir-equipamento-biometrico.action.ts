"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

function montarRetorno(orgaoId: string | null) {
  return orgaoId
    ? `/equipamentos?${new URLSearchParams({ orgaoId }).toString()}`
    : "/equipamentos";
}

export async function excluirEquipamentoBiometricoAction(formData: FormData) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "integracoes:gerenciar:global",
  );
  const escopo = await obterEscopoOrgaoDaSessao();
  const equipamentoId = String(formData.get("equipamentoId") ?? "").trim();
  const orgaoIdRetorno =
    String(formData.get("orgaoId") ?? "").trim() || null;
  const retorno = montarRetorno(orgaoIdRetorno);

  if (!equipamentoId) {
    redirect(retorno);
  }

  const equipamento = await prisma.equipamentoBiometrico.findUnique({
    where: { id: equipamentoId },
    select: {
      id: true,
      codigo: true,
      nome: true,
      fabricante: true,
      modelo: true,
      numeroSerie: true,
      localizacao: true,
      ip: true,
      porta: true,
      ativo: true,
      integracaoId: true,
      orgaoId: true,
      unidadeId: true,
      unidade: {
        select: {
          id: true,
          sigla: true,
          orgaoId: true,
        },
      },
      _count: {
        select: {
          eventos: true,
        },
      },
    },
  });

  if (!equipamento) {
    redirect(retorno);
  }

  const orgaoIdEquipamento =
    equipamento.orgaoId ?? equipamento.unidade?.orgaoId ?? null;

  if (
    !escopo.global &&
    (!orgaoIdEquipamento || !escopo.orgaoIds.includes(orgaoIdEquipamento))
  ) {
    redirect("/acesso-negado?permissao=integracoes%3Agerenciar%3Aglobal");
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "EquipamentoBiometrico",
        entidadeId: equipamento.id,
        acao: "EQUIPAMENTO_BIOMETRICO_EXCLUIDO",
        dadosAntes: {
          id: equipamento.id,
          codigo: equipamento.codigo,
          nome: equipamento.nome,
          fabricante: equipamento.fabricante,
          modelo: equipamento.modelo,
          numeroSerie: equipamento.numeroSerie,
          localizacao: equipamento.localizacao,
          ip: equipamento.ip,
          porta: equipamento.porta,
          ativo: equipamento.ativo,
          integracaoId: equipamento.integracaoId,
          orgaoId: orgaoIdEquipamento,
          unidadeId: equipamento.unidadeId,
          unidadeSigla: equipamento.unidade?.sigla ?? null,
          eventosVinculados: equipamento._count.eventos,
        },
      },
    });

    await tx.equipamentoBiometrico.delete({
      where: { id: equipamento.id },
    });
  });

  revalidatePath("/equipamentos");
  revalidatePath("/administracao/integracoes");
  redirect(retorno);
}
