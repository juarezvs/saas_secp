"use server";

import { revalidatePath } from "next/cache";

import {
  aplicarEscopoOrgaoId,
  obterEscopoOrgaoDaSessao,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  montarWhereServidores,
  type ListarServidoresParams,
} from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function desativarServidoresLoteAction(formData: FormData) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "servidores:desativar-lote:seccional",
  );
  const ids = formData
    .getAll("servidorId")
    .map((valor) => String(valor))
    .filter((valor) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        valor,
      ),
    );

  if (ids.length === 0) {
    return;
  }

  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const paramsEscopo = aplicarEscopoOrgaoId<ListarServidoresParams>(
    {
      orgaoId: "",
      status: "ativo",
    },
    escopoOrgao,
  );
  const where = montarWhereServidores(paramsEscopo);

  const servidoresPermitidos = await prisma.servidor.findMany({
    where: {
      AND: [
        where,
        {
          id: {
            in: ids,
          },
        },
      ],
    },
    select: {
      id: true,
      matricula: true,
    },
  });
  const idsPermitidos = servidoresPermitidos.map((servidor) => servidor.id);

  if (idsPermitidos.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.servidor.updateMany({
      where: {
        id: {
          in: idsPermitidos,
        },
      },
      data: {
        ativo: false,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Servidor",
        entidadeId: idsPermitidos[0],
        acao: "SERVIDORES_DESATIVADOS_EM_LOTE",
        dadosDepois: {
          total: idsPermitidos.length,
          servidorIds: idsPermitidos,
          matriculas: servidoresPermitidos.map((servidor) => servidor.matricula),
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });
  });

  revalidatePath("/servidores");
}
