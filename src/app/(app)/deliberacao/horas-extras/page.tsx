import Link from "next/link";
import { Scale } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarSolicitacoesHorasExtrasParaDeliberacao } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-solicitacao.repository";

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data);
}

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${horas}h${String(resto).padStart(2, "0")}`;
}

export default async function DeliberacaoHorasExtrasPage() {
  const permissao = await exigirPermissaoOuRedirecionar(
    "horas-extras:deliberar:global",
  );
  let solicitacoes: Awaited<
    ReturnType<typeof listarSolicitacoesHorasExtrasParaDeliberacao>
  > = [];
  let erroConsulta: string | null = null;

  try {
    solicitacoes = await listarSolicitacoesHorasExtrasParaDeliberacao({
      orgaoIds: permissao.orgaoIds,
      escopoGlobal: permissao.perfilAtivoEscopoGlobal,
    });
  } catch (error) {
    erroConsulta =
      error instanceof Error
        ? error.message
        : "Não foi possível consultar as solicitações.";
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Horas extras", href: "/horas-extras" },
          { label: "Deliberação" },
        ]}
      />

      <PageHeader
        icon={Scale}
        titulo="Deliberação de horas extras"
        descricao="Solicitações com parecer orçamentário aguardando decisão final."
      />

      <Card>
        <CardHeader>
          <CardTitle>Pendentes de deliberação</CardTitle>
        </CardHeader>
        <CardContent>
          {erroConsulta ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              {erroConsulta}
            </div>
          ) : solicitacoes.length > 0 ? (
            <div className="divide-y rounded-md border">
              {solicitacoes.map((solicitacao) => {
                const totalMinutos = solicitacao.days.reduce(
                  (total, day) => total + day.requestedMinutes,
                  0,
                );
                const parecer = solicitacao.budgetReviews[0];

                return (
                  <Link
                    key={solicitacao.id}
                    href={`/deliberacao/horas-extras/${solicitacao.id}`}
                    className="block p-4 transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">
                        {solicitacao.requestNumber}
                      </p>
                      <span className="rounded bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                        {parecer?.result ?? solicitacao.currentWorkflowStepCode}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatarData(solicitacao.periodStart)} a{" "}
                      {formatarData(solicitacao.periodEnd)} -{" "}
                      {formatarMinutos(totalMinutos)}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma solicitação aguardando deliberação.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
