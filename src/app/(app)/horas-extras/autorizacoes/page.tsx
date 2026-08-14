import Link from "next/link";
import { Download, FileCheck2, Plus } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarAutorizacoesHoraExtraSecap } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-autorizacao-secap.repository";
import { CalcularAutorizacaoHorasExtrasButton } from "@/modules/horas-extras/presentation/components/calcular-autorizacao-horas-extras-button";
import { GerarAtestoHorasExtrasButton } from "@/modules/horas-extras/presentation/components/gerar-atesto-horas-extras-button";
import { ProcessarExecucaoHorasExtrasButton } from "@/modules/horas-extras/presentation/components/processar-execucao-horas-extras-button";

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data);
}

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function rotuloStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default async function SecapAutorizacoesHorasExtrasPage() {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "horas-extras:cadastrar-autorizacao:seccional",
    "horas-extras:cadastrar-autorizacao:global",
    "horas-extras:visualizar-execucao:seccional",
    "horas-extras:visualizar-execucao:global",
  ]);
  const autorizacoes = await listarAutorizacoesHoraExtraSecap({
    orgaoIds: permissao.orgaoIds,
    escopoGlobal: permissao.perfilAtivoEscopoGlobal,
  });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Horas extras", href: "/horas-extras" },
          { label: "Autorizações" },
        ]}
      />

      <PageHeader
        icon={FileCheck2}
        titulo="Autorizações de horas-extras"
        descricao="Cadastro e acompanhamento das autorizações administrativas de horas-extras."
        actions={
          <Link href="/horas-extras/autorizacoes/nova">
            <Button leftIcon={<Plus className="size-4" />}>
              Nova autorização
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Autorizações registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {autorizacoes.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full divide-y text-sm">
                <thead className="bg-muted/60 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Processo</th>
                    <th className="px-3 py-2">Documento</th>
                    <th className="px-3 py-2">Competência</th>
                    <th className="px-3 py-2">Unidade</th>
                    <th className="px-3 py-2 text-right">Servidores</th>
                    <th className="px-3 py-2 text-right">Autorizado</th>
                    <th className="px-3 py-2 text-right">Classificações</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Registro</th>
                    <th className="px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {autorizacoes.map((autorizacao) => {
                    const totalAutorizado = autorizacao.servidores.reduce(
                      (total, servidor) =>
                        total + servidor.quantidadeMaximaMinutos,
                      0,
                    );
                    const totalClassificacoes = autorizacao.servidores.reduce(
                      (total, servidor) =>
                        total + servidor._count.classificacoes,
                      0,
                    );

                    return (
                      <tr key={autorizacao.id}>
                        <td className="px-3 py-3 font-medium">
                          {autorizacao.processoSei}
                        </td>
                        <td className="px-3 py-3">
                          {autorizacao.documentoAutorizacao}
                        </td>
                        <td className="px-3 py-3">
                          {autorizacao.mesReferencia}
                        </td>
                        <td className="px-3 py-3">
                          {autorizacao.unidade.sigla}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {autorizacao.servidores.length}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {formatarMinutos(totalAutorizado)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {totalClassificacoes}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                            {rotuloStatus(autorizacao.status)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {autorizacao.registradaEm
                            ? formatarData(autorizacao.registradaEm)
                            : "Rascunho"}
                        </td>
                        <td className="px-3 py-3">
                          {totalClassificacoes === 0 &&
                          autorizacao.status !== "RASCUNHO" ? (
                            <ProcessarExecucaoHorasExtrasButton
                              autorizacaoId={autorizacao.id}
                            />
                          ) : totalClassificacoes > 0 &&
                            autorizacao._count.atestos === 0 &&
                            autorizacao.status !== "ATESTADA" ? (
                            <GerarAtestoHorasExtrasButton
                              autorizacaoId={autorizacao.id}
                            />
                          ) : autorizacao.status === "ATESTADA" &&
                            autorizacao._count.calculos === 0 ? (
                            <CalcularAutorizacaoHorasExtrasButton
                              autorizacaoId={autorizacao.id}
                            />
                          ) : (
                            <div className="flex flex-col gap-2">
                              <span className="text-xs text-muted-foreground">
                                {autorizacao._count.calculos > 0
                                  ? "Calculada"
                                  : autorizacao._count.atestos > 0
                                    ? "Atestada"
                                  : totalClassificacoes > 0
                                    ? "Processada"
                                  : "Aguardando registro"}
                              </span>
                              {autorizacao._count.atestos > 0 && (
                                <Link
                                  href={`/api/horas-extras/atestados/${autorizacao.id}/pdf`}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:text-blue-950"
                                >
                                  <Download className="size-3" />
                                  PDF do atesto
                                </Link>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma autorização administrativa de horas-extras registrada.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
