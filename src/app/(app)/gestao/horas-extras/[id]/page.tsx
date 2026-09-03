import { notFound } from "next/navigation";
import { CalendarClock } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarSolicitacaoHorasExtrasPorId } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-solicitacao.repository";
import { HorasExtrasChefiaAnaliseForm } from "@/modules/horas-extras/presentation/components/horas-extras-chefia-analise-form";

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

export default async function GestaoHorasExtrasDetalhePage({
  params,
}: PageProps) {
  await exigirPermissaoOuRedirecionar("horas-extras:analisar:chefia");
  const { id } = await params;
  const solicitacao = await buscarSolicitacaoHorasExtrasPorId(id);

  if (!solicitacao) {
    notFound();
  }

  const totalMinutos = solicitacao.days.reduce(
    (total, day) => total + day.requestedMinutes,
    0,
  );
  const acoesDisponiveisChefia =
    solicitacao.currentWorkflowStepCode === "ANALISE_CHEFIA"
      ? [
          { actionCode: "APPROVE" as const, toStepCode: null },
          { actionCode: "REJECT" as const, toStepCode: null },
        ]
      : [];

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Horas extras", href: "/horas-extras" },
          { label: "Gestão", href: "/gestao/horas-extras" },
          { label: solicitacao.requestNumber },
        ]}
      />

      <PageHeader
        icon={CalendarClock}
        titulo={solicitacao.requestNumber}
        descricao={`${formatarData(solicitacao.periodStart)} a ${formatarData(
          solicitacao.periodEnd,
        )} - ${formatarMinutos(totalMinutos)} solicitadas.`}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados da solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6">
              <div>
                <p className="font-semibold text-foreground">Justificativa</p>
                <p className="text-muted-foreground">{solicitacao.justification}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Atividades</p>
                <p className="text-muted-foreground">
                  {solicitacao.activitiesDescription}
                </p>
              </div>
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Situação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
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
            </CardContent>
          </Card>

          {solicitacao.currentWorkflowStepCode === "ANALISE_CHEFIA" && (
            <HorasExtrasChefiaAnaliseForm
              requestId={solicitacao.id}
              acoesDisponiveis={acoesDisponiveisChefia}
            />
          )}
        </div>
      </div>
    </div>
  );
}
