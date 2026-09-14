import { ClipboardCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarSolicitacoesFeriasChefia } from "@/modules/programacao-ferias/infrastructure/repositories/programacao-ferias.repository";
import {
  MensagemFerias,
  ProgramacoesFeriasTable,
} from "@/modules/programacao-ferias/presentation/components/programacao-ferias-ui";

type PageProps = {
  searchParams?: Promise<{ ok?: string; erro?: string }>;
};

export default async function SolicitacoesFeriasChefiaPage({
  searchParams,
}: PageProps) {
  const [permissao, query] = await Promise.all([
    exigirUmaDasPermissoesOuRedirecionar([
      "programacao-ferias:analisar:subordinados",
    ]),
    searchParams,
  ]);

  if (!permissao.usuarioId) redirect("/login");

  const programacoes = await listarSolicitacoesFeriasChefia({
    usuarioId: permissao.usuarioId,
  });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Início", href: "/dashboard" },
          { label: "Minha equipe", href: "/minha-equipe/presencas" },
          { label: "Solicitações de férias" },
        ]}
      />

      <PageHeader
        icon={ClipboardCheck}
        titulo="Solicitações de férias"
        descricao="Analise as programações enviadas pelos servidores antes da execução pela área responsável."
      />

      <MensagemFerias ok={query?.ok} erro={query?.erro} />

      <ProgramacoesFeriasTable
        programacoes={programacoes}
        baseHref="/minha-equipe/ferias/solicitacoes"
        mostrarServidor
      />
    </div>
  );
}
