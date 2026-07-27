import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { atualizarSolicitacaoAction } from "@/modules/solicitacoes/application/actions/atualizar-solicitacao.action";
import {
  diasSemanaRegimeHibrido,
  type CriarSolicitacaoFormState,
} from "@/modules/solicitacoes/application/schemas/solicitacao.schema";
import { rotuloTipoSolicitacao } from "@/modules/solicitacoes/application/services/fluxo-solicitacao.service";
import { buscarSolicitacaoPorId } from "@/modules/solicitacoes/infrastructure/repositories/solicitacao.repository";
import { SolicitacaoForm } from "@/modules/solicitacoes/presentation/components/solicitacao-form";
import { FileText } from "lucide-react";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatarDataInput(data: Date | null) {
  if (!data) return "";
  return data.toISOString().slice(0, 10);
}

function formatarDateTimeInput(data: Date | null) {
  if (!data) return "";
  return data.toISOString().slice(0, 16);
}

function dadosComoRegistro(dados: unknown) {
  return dados && typeof dados === "object"
    ? (dados as Record<string, unknown>)
    : {};
}

function diasRemotosValidos(dias: unknown) {
  if (!Array.isArray(dias)) return [];

  return dias
    .map(String)
    .filter((dia): dia is (typeof diasSemanaRegimeHibrido)[number] =>
      diasSemanaRegimeHibrido.includes(
        dia as (typeof diasSemanaRegimeHibrido)[number],
      ),
    );
}

function montarValoresIniciais(
  solicitacao: NonNullable<Awaited<ReturnType<typeof buscarSolicitacaoPorId>>>,
): CriarSolicitacaoFormState["campos"] {
  const dados = dadosComoRegistro(solicitacao.dadosSolicitados);
  const regimeTrabalhoRemoto = dadosComoRegistro(dados.regimeTrabalhoRemoto);

  return {
    tipo: solicitacao.tipo,
    titulo: solicitacao.titulo,
    descricao: solicitacao.descricao,
    dataReferencia: formatarDataInput(solicitacao.dataReferencia),
    dataInicio: formatarDateTimeInput(solicitacao.dataInicio),
    dataFim: formatarDateTimeInput(solicitacao.dataFim),
    tipoMarcacao: String(dados.tipoMarcacao ?? ""),
    horaAjuste: String(dados.horaAjuste ?? ""),
    tipoCompensacao: String(dados.tipoCompensacao ?? "") as
      "UTILIZAR_CREDITO" | "COMPENSAR_DEBITO" | "",
    horasSolicitadas:
      typeof dados.horasSolicitadas === "number"
        ? dados.horasSolicitadas
        : undefined,
    regimeTrabalhoRemotoTipo: String(
      regimeTrabalhoRemoto.tipo ?? "NAO_SE_APLICA",
    ) as "NAO_SE_APLICA" | "TOTAL" | "HIBRIDO",
    diasRemotos: diasRemotosValidos(regimeTrabalhoRemoto.diasRemotos),
    modalidadeCapacitacao: String(dados.modalidadeCapacitacao ?? "") as
      "EXTERNA" | "INTERNA" | "",
  };
}

export default async function EditarSolicitacaoPage({ params }: PageProps) {
  const session = await auth();
  const { id } = await params;
  const solicitacao = await buscarSolicitacaoPorId(id);

  if (!session?.user || !solicitacao) {
    notFound();
  }

  if (solicitacao.usuarioSolicitanteId !== session.user.id) {
    notFound();
  }

  if (!["ENVIADA", "EM_ANALISE"].includes(solicitacao.status)) {
    notFound();
  }

  const valoresIniciais = montarValoresIniciais(solicitacao);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Solicitações", href: "/solicitacoes" },
          {
            label: solicitacao.titulo,
            href: `/solicitacoes/${solicitacao.id}`,
          },
          { label: "Editar" },
        ]}
      />

      <PageHeader
        icon={FileText}
        titulo="Editar solicitação"
        descricao={`Atualize os dados da solicitação de ${rotuloTipoSolicitacao(
          solicitacao.tipo,
        )}.`}
      />

      <SolicitacaoForm
        tipoInicial={solicitacao.tipo}
        valoresIniciais={valoresIniciais}
        action={atualizarSolicitacaoAction}
        hiddenFields={{ solicitacaoId: solicitacao.id }}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
