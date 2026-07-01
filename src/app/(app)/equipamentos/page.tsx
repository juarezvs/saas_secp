import { Cpu } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarColetasRelogioProgressivasAtivas } from "@/modules/integracoes/application/jobs/coleta-relogio-progressiva.jobs";
import { obterStatusHenryOnlineWorker } from "@/modules/integracoes/application/workers/henry-online-worker-runtime";
import { listarEquipamentosBiometricos } from "@/modules/integracoes/infrastructure/repositories/integracoes.repository";
import { EquipamentosPageTabs } from "@/modules/integracoes/presentation/components/equipamentos-page-tabs";
import { prisma } from "@/shared/infrastructure/database/prisma";

type EquipamentosPageProps = {
  searchParams?: Promise<{
    orgaoId?: string;
  }>;
};

export default async function EquipamentosPage({
  searchParams,
}: EquipamentosPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "integracoes:consultar:global",
    "integracoes:gerenciar:global",
    "afd:importar:global",
  ]);

  const params = searchParams ? await searchParams : {};
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaos = escopoOrgao.global
    ? await prisma.orgao.findMany({
        where: { ativo: true },
        select: { id: true, sigla: true, nome: true },
        orderBy: [{ sigla: "asc" }, { nome: "asc" }],
      })
    : escopoOrgao.orgaos;
  const orgaoSelecionado =
    orgaos.find((orgao) => orgao.id === params.orgaoId)?.id ??
    (!escopoOrgao.global ? (orgaos[0]?.id ?? null) : null);
  const orgaoAtual =
    orgaos.find((orgao) => orgao.id === orgaoSelecionado) ?? null;
  const integracoesHref = orgaoSelecionado
    ? `/administracao/integracoes?${new URLSearchParams({
        orgaoId: orgaoSelecionado,
      }).toString()}`
    : "/administracao/integracoes";

  const [equipamentos, coletasAtivas] = await Promise.all([
    listarEquipamentosBiometricos({
      orgaoId: orgaoSelecionado,
      orgaoIdsPermitidos: escopoOrgao.global ? undefined : escopoOrgao.orgaoIds,
    }),
    listarColetasRelogioProgressivasAtivas(),
  ]);
  const statusListenerOnline = obterStatusHenryOnlineWorker();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Integrações por seccional", href: integracoesHref },
          { label: "Equipamentos biométricos" },
        ]}
      />

      <PageHeader
        icon={Cpu}
        titulo="Equipamentos biométricos"
        descricao={
          orgaoAtual
            ? `Relógios vinculados à seccional ${orgaoAtual.sigla}.`
            : "Cadastre relógios de ponto, REP, totens e dispositivos biométricos usados para receber marcações oficiais e importar arquivos AFD."
        }
        artigo="Controle de frequência"
        regraTitulo="Equipamento, AFD e rastreabilidade"
        regraDescricao="Ao importar AFD, o SECP tenta associar o arquivo ao equipamento cadastrado pelo código ou número de série, preservando a origem da marcação."
      />

      <EquipamentosPageTabs
        equipamentos={equipamentos}
        coletasAtivas={coletasAtivas}
        statusListenerOnline={statusListenerOnline}
        orgaoId={orgaoSelecionado}
      />
    </div>
  );
}
