import { notFound, redirect } from "next/navigation";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Card } from "@/components/ui";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { buscarFechamentoPorId } from "@/modules/homologacao/infrastructure/repositories/homologacao.repository";
import { FechamentoUnidadeCard } from "@/modules/homologacao/presentation/components/fechamento-unidade-card";
import { ServidoresHomologacaoTable } from "@/modules/homologacao/presentation/components/servidores-homologacao-table";

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
  const podeGlobal =
    permissoes.includes("homologacao:consultar:global") ||
    permissoes.includes("homologacao:gerenciar:global");

  if (!podeGlobal && permissao.usuarioId) {
    const unidadesSubordinadas = await listarIdsUnidadesSubordinadasPorUsuario(
      permissao.usuarioId,
    );

    if (!unidadesSubordinadas.includes(fechamento.unidadeId)) {
      redirect("/acesso-negado");
    }
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
      />
    </div>
  );
}
