import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Cpu } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  buscarEquipamentoBiometricoPorId,
  listarUnidadesParaEquipamentos,
} from "@/modules/integracoes/infrastructure/repositories/integracoes.repository";
import { EquipamentoBiometricoForm } from "@/modules/integracoes/presentation/components/equipamento-biometrico-form";
import { prisma } from "@/shared/infrastructure/database/prisma";

type EditarEquipamentoPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    orgaoId?: string;
  }>;
};

export default async function EditarEquipamentoPage({
  params,
  searchParams,
}: EditarEquipamentoPageProps) {
  await exigirPermissaoOuRedirecionar("integracoes:gerenciar:global");

  const [{ id }, query] = await Promise.all([
    params,
    searchParams
      ? searchParams
      : Promise.resolve({} as { orgaoId?: string }),
  ]);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const equipamento = await buscarEquipamentoBiometricoPorId(id);

  if (!equipamento) {
    notFound();
  }

  const orgaoDoEquipamento = equipamento.orgaoId ?? equipamento.unidade?.orgaoId ?? null;
  const orgaoSelecionado =
    escopoOrgao.global && query.orgaoId
      ? query.orgaoId
      : escopoOrgao.orgaoIds.includes(query.orgaoId ?? "")
      ? query.orgaoId
      : orgaoDoEquipamento;

  if (
    !escopoOrgao.global &&
    orgaoDoEquipamento &&
    !escopoOrgao.orgaoIds.includes(orgaoDoEquipamento)
  ) {
    notFound();
  }

  const equipamentosHref = orgaoSelecionado
    ? `/equipamentos?${new URLSearchParams({
        orgaoId: orgaoSelecionado,
      }).toString()}`
    : "/equipamentos";
  const unidades = await listarUnidadesParaEquipamentos({
    orgaoId: escopoOrgao.global ? undefined : orgaoDoEquipamento,
    orgaoIdsPermitidos: escopoOrgao.global ? undefined : escopoOrgao.orgaoIds,
  });
  const orgaos = escopoOrgao.global
    ? await prisma.orgao.findMany({
        where: { ativo: true },
        select: { id: true, sigla: true, nome: true },
        orderBy: { sigla: "asc" },
      })
    : escopoOrgao.orgaos;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Equipamentos biométricos", href: equipamentosHref },
          { label: "Editar" },
        ]}
      />

      <PageHeader
        icon={Cpu}
        titulo="Editar equipamento biométrico"
        descricao={
          escopoOrgao.global
            ? "Atualize dados de conexão, credenciais, protocolo, status, próximo NSR e transfira o equipamento para outra seccional escolhendo a unidade de destino."
            : "Atualize dados de conexão, credenciais, protocolo, status e próximo NSR de coleta."
        }
        actions={
          <Link
            href={equipamentosHref}
            className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para listagem
          </Link>
        }
      />

      <EquipamentoBiometricoForm
        orgaos={orgaos}
        unidades={unidades}
        equipamento={equipamento}
      />
    </div>
  );
}
