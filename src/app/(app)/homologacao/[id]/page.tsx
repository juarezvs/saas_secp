import { notFound, redirect } from "next/navigation";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Card } from "@/components/ui";
import {
  montarOpcoesCargoFuncaoAssinatura,
  resolverSeccionalAssinatura,
} from "@/modules/documentos-autenticacao/application/services/dados-assinatura-documento.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { buscarFechamentoPorId } from "@/modules/homologacao/infrastructure/repositories/homologacao.repository";
import { FechamentoUnidadeCard } from "@/modules/homologacao/presentation/components/fechamento-unidade-card";
import { ServidoresHomologacaoTable } from "@/modules/homologacao/presentation/components/servidores-homologacao-table";
import { prisma } from "@/shared/infrastructure/database/prisma";

type HomologacaoDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function HomologacaoDetalhePage({
  params,
}: HomologacaoDetalhePageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "homologacao:gerenciar:chefia",
    "homologacao:consultar:global",
    "homologacao:gerenciar:global",
  ]);
  const { id } = await params;
  const fechamento = await buscarFechamentoPorId(id);

  if (!fechamento) {
    notFound();
  }

  const permissoes = permissao.permissoes;
  const podeConsultarGlobal =
    permissoes.includes("homologacao:consultar:global") ||
    permissoes.includes("homologacao:gerenciar:global");
  const podeGerenciarGlobal = permissoes.includes(
    "homologacao:gerenciar:global",
  );
  const perfilChefiaAtivo =
    permissao.perfilAtivoCodigo?.toUpperCase() === "CHEFIA";
  const podeGerenciarComoChefia =
    perfilChefiaAtivo || permissoes.includes("homologacao:gerenciar:chefia");
  const unidadesSubordinadas = permissao.usuarioId
    ? await listarIdsUnidadesSubordinadasPorUsuario(permissao.usuarioId)
    : [];
  const servidorAssinante = permissao.usuarioId
    ? await prisma.servidor.findFirst({
        where: {
          usuarioId: permissao.usuarioId,
          ativo: true,
        },
        include: {
          orgao: true,
          cargo: true,
          lotacoes: {
            where: {
              status: "ATIVO",
            },
            include: {
              cargo: true,
              unidade: {
                include: {
                  orgao: true,
                },
              },
            },
            orderBy: {
              dataInicio: "desc",
            },
          },
        },
      })
    : null;
  const fechamentoEstaAbaixoDaChefia = unidadesSubordinadas.includes(
    fechamento.unidadeId,
  );
  const servidorIdsAbaixoDaChefia = fechamento.servidores
    .filter((item) =>
      item.servidor.lotacoes.some((lotacao) =>
        unidadesSubordinadas.includes(lotacao.unidadeId),
      ),
    )
    .map((item) => item.servidorId);
  const algumServidorEstaAbaixoDaChefia = servidorIdsAbaixoDaChefia.length > 0;
  const podeRegistrarDecisao =
    podeGerenciarGlobal ||
    (podeGerenciarComoChefia &&
      (fechamentoEstaAbaixoDaChefia || algumServidorEstaAbaixoDaChefia));

  if (
    !podeConsultarGlobal &&
    !fechamentoEstaAbaixoDaChefia &&
    !algumServidorEstaAbaixoDaChefia
  ) {
    redirect("/acesso-negado");
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Homologacao", href: "/homologacao" },
          {
            label: `${fechamento.unidade.sigla} ${String(
              fechamento.mesReferencia,
            ).padStart(2, "0")}/${fechamento.anoReferencia}`,
          },
        ]}
      />

      <FechamentoUnidadeCard fechamento={fechamento} />

      <Card className="p-4 text-sm text-muted-foreground">
        A chefia titular, substituta ou delegada pode homologar os espelhos
        enviados pelos servidores vinculados a sua unidade ou as unidades
        subordinadas.
      </Card>

      <ServidoresHomologacaoTable
        fechamentoId={fechamento.id}
        anoReferencia={fechamento.anoReferencia}
        mesReferencia={fechamento.mesReferencia}
        servidores={fechamento.servidores}
        podeRegistrarDecisao={podeRegistrarDecisao}
        assinatura={{
          orgao:
            resolverSeccionalAssinatura(servidorAssinante) ??
            permissao.orgaoSiglas?.[0] ??
            fechamento.unidade.sigla,
          assinante:
            permissao.usuarioNome ??
            permissao.usuarioMatricula ??
            "Usuário logado",
          cargoFuncoes: montarOpcoesCargoFuncaoAssinatura(servidorAssinante),
        }}
        servidorIdsPermitidosDecisao={
          podeGerenciarGlobal ? undefined : servidorIdsAbaixoDaChefia
        }
      />
    </div>
  );
}
