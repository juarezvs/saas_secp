import { ClipboardList } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { tiposSolicitacao } from "@/modules/solicitacoes/application/schemas/solicitacao.schema";
import { SolicitacaoForm } from "@/modules/solicitacoes/presentation/components/solicitacao-form";

type NovaSolicitacaoPageProps = {
  searchParams?: Promise<{
    tipo?: string;
  }>;
};

function normalizarTipoSolicitacao(valor?: string | null) {
  return tiposSolicitacao.find((tipo) => tipo === valor) ?? "AJUSTE_PONTO";
}

export default async function NovaSolicitacaoPage({
  searchParams,
}: NovaSolicitacaoPageProps) {
  await exigirPermissaoOuRedirecionar("solicitacoes:criar:proprio");
  const params = searchParams ? await searchParams : {};
  const tipoInicial = normalizarTipoSolicitacao(params.tipo);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Solicitações", href: "/solicitacoes" },
          { label: "Nova solicitacao" },
        ]}
      />

      <PageHeader
        icon={ClipboardList}
        titulo="Nova solicitacao"
        descricao="Registre pedidos de ajuste, abono, atividade externa, capacitacao, viagem, dispensa de ponto, teletrabalho ou autorizacao previa de horas."
        artigo="Arts. 8, 9, 10, 13, 14, 16 e 18"
        regraTitulo="Solicitação e análise pela chefia"
        regraDescricao="Pedidos que impactam a frequencia devem registrar periodo, justificativa, decisao da chefia e efeitos na apuracao."
      />

      <SolicitacaoForm key={tipoInicial} tipoInicial={tipoInicial} />
    </div>
  );
}
