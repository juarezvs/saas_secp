import { FileText } from "lucide-react";
import { redirect } from "next/navigation";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarServidorComUsuarioPorUsuarioId } from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import {
  buscarContrachequeSarh,
  listarDocumentosContrachequeSarh,
} from "@/modules/contracheque/infrastructure/oracle/contracheque-oracle.repository";
import {
  normalizarCompetenciaContracheque,
  rotuloCompetenciaContracheque,
} from "@/modules/contracheque/application/services/formatar-contracheque.service";
import { ContrachequeDemonstrativo } from "@/modules/contracheque/presentation/components/contracheque-demonstrativo";
import { ContrachequeDocumentoSelect } from "@/modules/contracheque/presentation/components/contracheque-documento-select";
import { MeuContrachequeFiltrosAuto } from "@/modules/contracheque/presentation/components/meu-contracheque-filtros-auto";
import { RelatorioExportacaoButton } from "@/modules/relatorios/presentation/components/relatorio-exportacao-button";
import type {
  ContrachequeDados,
  ContrachequeDocumento,
} from "@/modules/contracheque/domain/contracheque.types";

type MeuContrachequePageProps = {
  searchParams: Promise<{
    competencia?: string;
    documento?: string;
  }>;
};

function perfilServidorAtivo(codigo?: string | null) {
  return codigo?.toUpperCase() === "SERVIDOR";
}

function montarHrefExportacao(competencia: string, documentoId?: string | null) {
  const query = new URLSearchParams({ competencia });

  if (documentoId) {
    query.set("documento", documentoId);
  }

  return `/api/contracheque/pdf?${query.toString()}`;
}

export default async function MeuContrachequePage({
  searchParams,
}: MeuContrachequePageProps) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "contracheque:consultar:proprio",
  );

  if (!perfilServidorAtivo(permissao.perfilAtivoCodigo)) {
    redirect(
      `/acesso-negado?permissao=${encodeURIComponent(
        "contracheque:consultar:proprio",
      )}`,
    );
  }

  const params = await searchParams;
  const competencia = normalizarCompetenciaContracheque(params.competencia);

  if (!params.competencia) {
    redirect(`/meu-contracheque?competencia=${competencia}`);
  }

  const servidor = permissao.usuarioId
    ? await buscarServidorComUsuarioPorUsuarioId(permissao.usuarioId)
    : null;

  if (!servidor) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Meu contracheque" }]} />
        <PageHeader
          icon={FileText}
          titulo="Meu contracheque"
          descricao="Consulte o próprio demonstrativo de pagamento diretamente no SARH."
        />
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum servidor ativo vinculado ao usuário atual foi encontrado.
        </Card>
      </div>
    );
  }

  let contracheque: ContrachequeDados | null = null;
  let documentos: ContrachequeDocumento[] = [];
  let documentoSelecionado: ContrachequeDocumento | null = null;
  let erroConsulta: string | null = null;

  try {
    documentos = await listarDocumentosContrachequeSarh({
      matricula: servidor.matricula,
      competencia,
      orgaoId: servidor.orgaoId,
    });

    documentoSelecionado =
      documentos.find((documento) => documento.id === params.documento) ??
      documentos[0] ??
      null;

    if (documentoSelecionado) {
      contracheque = await buscarContrachequeSarh({
        matricula: servidor.matricula,
        competencia,
        documentoId: documentoSelecionado.id,
        orgaoId: servidor.orgaoId,
      });
    }
  } catch (error) {
    erroConsulta =
      error instanceof Error
        ? error.message
        : "Não foi possível consultar o SARH.";
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Meu contracheque" }]} />

      <PageHeader
        icon={FileText}
        titulo="Meu contracheque"
        actions={
          contracheque ? (
            <RelatorioExportacaoButton
              href={montarHrefExportacao(
                competencia,
                contracheque.documento.id,
              )}
              modo="auto"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
            />
          ) : null
        }
      />

      <Card className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <MeuContrachequeFiltrosAuto competencia={competencia} />

          {documentos.length > 1 && documentoSelecionado && (
            <ContrachequeDocumentoSelect
              competencia={competencia}
              documentos={documentos}
              documentoSelecionadoId={documentoSelecionado.id}
            />
          )}

          <div className="shrink-0 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
            <p className="font-semibold">Fonte oficial: SARH</p>
            <p className="mt-1 leading-5">
              Dados exibidos sob demanda, sem armazenamento no SECP.
            </p>
          </div>
        </div>
      </Card>

      {erroConsulta ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {erroConsulta}
        </Card>
      ) : contracheque ? (
        <ContrachequeDemonstrativo contracheque={contracheque} />
      ) : (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum contracheque foi encontrado no SARH para{" "}
          {rotuloCompetenciaContracheque(competencia)}.
        </Card>
      )}
    </div>
  );
}
