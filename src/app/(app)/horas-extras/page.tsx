import Link from "next/link";
import { CalendarClock, Plus } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { excluirRascunhoHorasExtrasAction } from "@/modules/horas-extras/application/actions/excluir-rascunho-horas-extras.action";
import { listarConfiguracaoHorasExtras } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-config.repository";
import { listarSolicitacoesHorasExtras } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-solicitacao.repository";
import { ExcluirRascunhoHorasExtrasButton } from "@/modules/horas-extras/presentation/components/excluir-rascunho-horas-extras-button";

const rotulosStatus: Record<string, string> = {
  DRAFT: "Rascunho",
  SUBMITTED: "Enviada",
  IN_WORKFLOW: "Em tramitação",
  RETURNED: "Devolvida",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data);
}

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

export default async function HorasExtrasPage() {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "horas-extras:visualizar:proprio",
    "horas-extras:solicitar:proprio",
    "horas-extras:analisar:chefia",
    "horas-extras:visualizar-execucao:global",
    "horas-extras:visualizar-folha:global",
  ]);
  let configuracao: Awaited<ReturnType<typeof listarConfiguracaoHorasExtras>> | null =
    null;
  let solicitacoes: Awaited<ReturnType<typeof listarSolicitacoesHorasExtras>> =
    [];
  let erroConfiguracao: string | null = null;

  try {
    [configuracao, solicitacoes] = await Promise.all([
      listarConfiguracaoHorasExtras({
        orgaoIds: permissao.orgaoIds,
        escopoGlobal: permissao.perfilAtivoEscopoGlobal,
      }),
      listarSolicitacoesHorasExtras({
        orgaoIds: permissao.orgaoIds,
        escopoGlobal: permissao.perfilAtivoEscopoGlobal,
        usuarioId: permissao.usuarioId,
        limite: 10,
      }),
    ]);
  } catch (error) {
    erroConfiguracao =
      error instanceof Error
        ? error.message
        : "Não foi possível consultar a configuração de horas extras.";
  }

  const workflowAtivo = configuracao?.workflows[0];
  const workflowVersionAtiva = workflowAtivo?.versions[0];
  const politicaAtiva = configuracao?.policies[0];
  const politicaVersionAtiva = politicaAtiva?.versions[0];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Horas extras" }]} />

      <PageHeader
        icon={CalendarClock}
        titulo="Horas extras"
        descricao="Solicitação, autorização, execução e pagamento de serviço extraordinário com política e workflow versionados."
        actions={
          <Link
            href="/horas-extras/nova"
            className="secp-theme-primary-action inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus className="size-4" aria-hidden="true" />
            Nova solicitação
          </Link>
        }
      />

      {erroConfiguracao && (
        <Card className="border-amber-200 bg-amber-50 text-amber-950">
          <CardContent className="pt-5 text-sm leading-6">
            Configuração persistente indisponível. Aplique a migration de horas
            extras e execute o seed para visualizar política e workflow ativos.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Minhas solicitações</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6">
            {solicitacoes.length > 0 ? (
              <div className="space-y-3">
                {solicitacoes.map((solicitacao) => {
                  const totalMinutos = solicitacao.days.reduce(
                    (total, day) => total + day.requestedMinutes,
                    0,
                  );
                  const rascunho =
                    solicitacao.currentLifecycleStatus === "DRAFT";

                  return (
                    <div
                      key={solicitacao.id}
                      className="rounded-md border border-border p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">
                          {solicitacao.requestNumber}
                        </p>
                        <span className="rounded bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                          {rotulosStatus[solicitacao.currentLifecycleStatus] ??
                            solicitacao.currentLifecycleStatus}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {formatarData(solicitacao.periodStart)} a{" "}
                        {formatarData(solicitacao.periodEnd)} -{" "}
                        {formatarMinutos(totalMinutos)}
                      </p>
                      {rascunho && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href={`/horas-extras/nova?rascunho=${solicitacao.id}`}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-semibold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            Continuar rascunho
                          </Link>
                          <ExcluirRascunhoHorasExtrasButton
                            action={excluirRascunhoHorasExtrasAction.bind(
                              null,
                              solicitacao.id,
                            )}
                            requestNumber={solicitacao.requestNumber}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Nenhuma solicitação de horas extras registrada para o perfil
                atual.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            {workflowAtivo && workflowVersionAtiva ? (
              <>
                <span className="font-semibold text-foreground">
                  {workflowAtivo.name}
                </span>
                <span className="block">
                  {workflowVersionAtiva.steps.length} etapas configuradas.
                </span>
              </>
            ) : (
              "O fluxo alvo será configurável por órgão, com chefia, orçamento, deliberação final, execução, fechamento e pagamento."
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Política</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            {politicaAtiva && politicaVersionAtiva ? (
              <>
                <span className="font-semibold text-foreground">
                  {politicaAtiva.name}
                </span>
                <span className="block">
                  {politicaVersionAtiva.rateRules.length} regras de percentual
                  ativas, com limite mensal de{" "}
                  {formatarMinutos(politicaVersionAtiva.monthlyLimitMinutes ?? 0)}.
                </span>
              </>
            ) : (
              "A política inicial de referência usa 50% para dias úteis/sábados, 100% para domingos/feriados e limite de duas horas em dias úteis."
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
