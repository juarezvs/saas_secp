"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import {
  obterPermissoesDaSessao,
  possuiPermissaoNaLista,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

const procedimentoSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().trim().min(3).max(180),
  objetivoFinal: z.string().trim().min(10).max(3000),
  descricao: z.string().trim().max(4000).optional(),
  fundamentoNormativo: z.string().trim().max(3000).optional(),
  requerProcessoSei: z.boolean(),
  requerCienciaGestor: z.boolean(),
  requerAutoridade: z.boolean(),
  requerAnexo: z.boolean(),
  permiteBancoAberto: z.boolean(),
  permiteBancoFechado: z.boolean(),
  preservaHistoricoOriginal: z.boolean(),
  permiteRecalculo: z.boolean(),
  permiteLancamentoCompetenciaPosterior: z.boolean(),
  mesesRetroatividadeLivre: z.coerce.number().int().min(0).max(120),
  permissaoExecutar: z.string().trim().max(160).optional(),
  permissaoAutorizar: z.string().trim().max(160).optional(),
  ativo: z.boolean(),
});

function check(formData: FormData, nome: string) {
  return formData.get(nome) === "on";
}

function texto(formData: FormData, nome: string) {
  return String(formData.get(nome) ?? "").trim() || undefined;
}

export async function salvarProcedimentosFrequenciaAction(formData: FormData) {
  const orgaoId = String(formData.get("orgaoId") ?? "");
  const ids = formData.getAll("procedimentoId").map(String);
  const permissoesSessao = await obterPermissoesDaSessao();

  if (!permissoesSessao.permitido) {
    redirect("/login");
  }

  const podeGerenciar =
    (possuiPermissaoNaLista(
      permissoesSessao.permissoes,
      "procedimentos-frequencia:gerenciar:global",
    ) &&
      usuarioPossuiPermissaoNoPerfil(
        permissoesSessao.perfilAtivoCodigo,
        permissoesSessao.permissoes,
        "procedimentos-frequencia:gerenciar:global",
      )) ||
    (possuiPermissaoNaLista(
      permissoesSessao.permissoes,
      "procedimentos-frequencia:gerenciar:seccional",
    ) &&
      usuarioPossuiPermissaoNoPerfil(
        permissoesSessao.perfilAtivoCodigo,
        permissoesSessao.permissoes,
        "procedimentos-frequencia:gerenciar:seccional",
      ));

  if (!podeGerenciar) {
    redirect(
      "/acesso-negado?permissao=procedimentos-frequencia%3Agerenciar%3Aseccional",
    );
  }

  const escopo = await obterEscopoOrgaoDaSessao();

  if (!escopo.global && !escopo.orgaoIds.includes(orgaoId)) {
    redirect(
      "/acesso-negado?permissao=procedimentos-frequencia%3Agerenciar%3Aseccional",
    );
  }

  const procedimentos = ids.map((id) =>
    procedimentoSchema.parse({
      id,
      nome: formData.get(`nome-${id}`),
      objetivoFinal: formData.get(`objetivoFinal-${id}`),
      descricao: texto(formData, `descricao-${id}`),
      fundamentoNormativo: texto(formData, `fundamentoNormativo-${id}`),
      requerProcessoSei: check(formData, `requerProcessoSei-${id}`),
      requerCienciaGestor: check(formData, `requerCienciaGestor-${id}`),
      requerAutoridade: check(formData, `requerAutoridade-${id}`),
      requerAnexo: check(formData, `requerAnexo-${id}`),
      permiteBancoAberto: check(formData, `permiteBancoAberto-${id}`),
      permiteBancoFechado: check(formData, `permiteBancoFechado-${id}`),
      preservaHistoricoOriginal: check(
        formData,
        `preservaHistoricoOriginal-${id}`,
      ),
      permiteRecalculo: check(formData, `permiteRecalculo-${id}`),
      permiteLancamentoCompetenciaPosterior: check(
        formData,
        `permiteLancamentoCompetenciaPosterior-${id}`,
      ),
      mesesRetroatividadeLivre: formData.get(`mesesRetroatividadeLivre-${id}`),
      permissaoExecutar: texto(formData, `permissaoExecutar-${id}`),
      permissaoAutorizar: texto(formData, `permissaoAutorizar-${id}`),
      ativo: check(formData, `ativo-${id}`),
    }),
  );

  const procedimentosDoOrgao = await prisma.procedimentoAdministrativoFrequencia.findMany({
    where: {
      orgaoId,
      id: {
        in: procedimentos.map((procedimento) => procedimento.id),
      },
    },
    select: {
      id: true,
    },
  });
  const idsPermitidos = new Set(
    procedimentosDoOrgao.map((procedimento) => procedimento.id),
  );

  if (
    procedimentos.length !== procedimentosDoOrgao.length ||
    procedimentos.some((procedimento) => !idsPermitidos.has(procedimento.id))
  ) {
    redirect(
      "/acesso-negado?permissao=procedimentos-frequencia%3Agerenciar%3Aseccional",
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const procedimento of procedimentos) {
      await tx.procedimentoAdministrativoFrequencia.update({
        where: {
          id: procedimento.id,
        },
        data: {
          nome: procedimento.nome,
          objetivoFinal: procedimento.objetivoFinal,
          descricao: procedimento.descricao ?? null,
          fundamentoNormativo: procedimento.fundamentoNormativo ?? null,
          requerProcessoSei: procedimento.requerProcessoSei,
          requerCienciaGestor: procedimento.requerCienciaGestor,
          requerAutoridade: procedimento.requerAutoridade,
          requerAnexo: procedimento.requerAnexo,
          permiteBancoAberto: procedimento.permiteBancoAberto,
          permiteBancoFechado: procedimento.permiteBancoFechado,
          preservaHistoricoOriginal: procedimento.preservaHistoricoOriginal,
          permiteRecalculo: procedimento.permiteRecalculo,
          permiteLancamentoCompetenciaPosterior:
            procedimento.permiteLancamentoCompetenciaPosterior,
          mesesRetroatividadeLivre: procedimento.mesesRetroatividadeLivre,
          permissaoExecutar: procedimento.permissaoExecutar ?? null,
          permissaoAutorizar: procedimento.permissaoAutorizar ?? null,
          ativo: procedimento.ativo,
        },
      });
    }
  });

  revalidatePath("/administracao/procedimentos-frequencia");
  revalidatePath(`/administracao/procedimentos-frequencia/${orgaoId}`);
}
