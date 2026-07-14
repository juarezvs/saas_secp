import Link from "next/link";
import { ArrowLeft, Cpu } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  garantirUnidadeRaizParaEquipamentos,
  listarUnidadesParaEquipamentos,
} from "@/modules/integracoes/infrastructure/repositories/integracoes.repository";
import { EquipamentoBiometricoForm } from "@/modules/integracoes/presentation/components/equipamento-biometrico-form";
import { prisma } from "@/shared/infrastructure/database/prisma";

type NovoEquipamentoPageProps = {
  searchParams?: Promise<{
    orgaoId?: string;
  }>;
};

export default async function NovoEquipamentoPage({
  searchParams,
}: NovoEquipamentoPageProps) {
  await exigirPermissaoOuRedirecionar("integracoes:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaos = escopoOrgao.global
    ? await prisma.orgao.findMany({
        where: { ativo: true },
        select: { id: true, sigla: true, nome: true },
      })
    : escopoOrgao.orgaos;
  const orgaoSelecionado =
    orgaos.find((orgao) => orgao.id === params.orgaoId)?.id ??
    (!escopoOrgao.global ? (orgaos[0]?.id ?? null) : null);
  const equipamentosHref = orgaoSelecionado
    ? `/equipamentos?${new URLSearchParams({
        orgaoId: orgaoSelecionado,
      }).toString()}`
    : "/equipamentos";

  await garantirUnidadeRaizParaEquipamentos(orgaoSelecionado);

  const unidades = await listarUnidadesParaEquipamentos({
    orgaoId: orgaoSelecionado,
    orgaoIdsPermitidos: escopoOrgao.global ? undefined : escopoOrgao.orgaoIds,
  });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Equipamentos biométricos", href: equipamentosHref },
          { label: "Novo" },
        ]}
      />

      <PageHeader
        icon={Cpu}
        titulo="Novo equipamento biométrico"
        descricao="Cadastre dados de conexão, protocolo, credenciais e NSR inicial de coleta."
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

      <EquipamentoBiometricoForm orgaos={orgaos} unidades={unidades} />
    </div>
  );
}
