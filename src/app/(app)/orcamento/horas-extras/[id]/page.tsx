import { notFound } from "next/navigation";
import { Landmark } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarSolicitacaoHorasExtrasPorId } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-solicitacao.repository";
import { HorasExtrasOrcamentoForm } from "@/modules/horas-extras/presentation/components/horas-extras-orcamento-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data);
}

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${horas}h${String(resto).padStart(2, "0")}`;
}

export default async function OrcamentoHorasExtrasDetalhePage({
  params,
}: PageProps) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "horas-extras:responder-orcamento:global",
  );
  const { id } = await params;
  const solicitacao = await buscarSolicitacaoHorasExtrasPorId(id);

  if (!solicitacao) {
    notFound();
  }

  if (
    !permissao.perfilAtivoEscopoGlobal &&
    permissao.orgaoIds?.length &&
    !permissao.orgaoIds.includes(solicitacao.orgaoId)
  ) {
    notFound();
  }

  const totalMinutos = solicitacao.days.reduce(
    (total, day) => total + day.requestedMinutes,
    0,
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Horas extras", href: "/horas-extras" },
          { label: "Orçamento", href: "/orcamento/horas-extras" },
          { label: solicitacao.requestNumber },
        ]}
      />

      <PageHeader
        icon={Landmark}
        titulo={solicitacao.requestNumber}
        descricao={`${formatarData(solicitacao.periodStart)} a ${formatarData(
          solicitacao.periodEnd,
        )} - ${formatarMinutos(totalMinutos)} solicitadas.`}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6">
              <p>
                <span className="font-semibold">Status:</span>{" "}
                {solicitacao.currentLifecycleStatus}
              </p>
              <p>
                <span className="font-semibold">Etapa:</span>{" "}
                {solicitacao.currentWorkflowStepCode ?? "-"}
              </p>
              <p>
                <span className="font-semibold">Destino:</span>{" "}
                {solicitacao.paymentDestination}
              </p>
              <p>
                <span className="font-semibold">Justificativa:</span>{" "}
                {solicitacao.justification}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datas solicitadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-md border text-sm">
                {solicitacao.days.map((day) => (
                  <div
                    key={day.id}
                    className="grid gap-2 p-3 md:grid-cols-[8rem_1fr_8rem]"
                  >
                    <span className="font-semibold">
                      {formatarData(day.date)}
                    </span>
                    <span className="text-muted-foreground">
                      {day.dayTypeSnapshot}
                    </span>
                    <span>{formatarMinutos(day.requestedMinutes)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {solicitacao.currentWorkflowStepCode === "ANALISE_ORCAMENTARIA" && (
          <HorasExtrasOrcamentoForm
            requestId={solicitacao.id}
            totalMinutos={totalMinutos}
          />
        )}
      </div>
    </div>
  );
}

