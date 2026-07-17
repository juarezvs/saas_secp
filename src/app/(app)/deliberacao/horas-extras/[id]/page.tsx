import { notFound } from "next/navigation";
import { Scale } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarSolicitacaoHorasExtrasPorId } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-solicitacao.repository";
import { HorasExtrasDeliberacaoForm } from "@/modules/horas-extras/presentation/components/horas-extras-deliberacao-form";

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

function formatarValor(valor: { toString(): string } | null | undefined) {
  if (!valor) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor.toString()));
}

export default async function DeliberacaoHorasExtrasDetalhePage({
  params,
}: PageProps) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "horas-extras:deliberar:global",
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
  const parecer = solicitacao.budgetReviews[0];
  const limiteOrcamentarioMinutos =
    parecer?.result === "UNAVAILABLE"
      ? 0
      : (parecer?.approvedMinutes ?? totalMinutos);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Horas extras", href: "/horas-extras" },
          { label: "Deliberação", href: "/deliberacao/horas-extras" },
          { label: solicitacao.requestNumber },
        ]}
      />

      <PageHeader
        icon={Scale}
        titulo={solicitacao.requestNumber}
        descricao={`${formatarData(solicitacao.periodStart)} a ${formatarData(
          solicitacao.periodEnd,
        )} - ${formatarMinutos(totalMinutos)} solicitadas.`}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
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
              <div className="grid gap-3 md:grid-cols-3">
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
              <CardTitle>Parecer orçamentário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {parecer ? (
                <>
                  <p>
                    <span className="font-semibold">Resultado:</span>{" "}
                    {parecer.result}
                  </p>
                  <p>
                    <span className="font-semibold">Minutos cobertos:</span>{" "}
                    {formatarMinutos(parecer.approvedMinutes ?? totalMinutos)}
                  </p>
                  <p>
                    <span className="font-semibold">Valor disponível:</span>{" "}
                    {formatarValor(parecer.availableAmount)}
                  </p>
                  <p>
                    <span className="font-semibold">Valor reservado:</span>{" "}
                    {formatarValor(parecer.reservedAmount)}
                  </p>
                  <p>
                    <span className="font-semibold">Processo SEI:</span>{" "}
                    {parecer.seiProcessReference ?? "-"}
                  </p>
                  {parecer.notes && (
                    <p className="pt-2 text-muted-foreground">{parecer.notes}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Nenhum parecer orçamentário localizado.
                </p>
              )}
            </CardContent>
          </Card>

          {solicitacao.currentWorkflowStepCode === "DELIBERACAO_FINAL" && (
            <HorasExtrasDeliberacaoForm
              requestId={solicitacao.id}
              totalMinutos={totalMinutos}
              limiteOrcamentarioMinutos={limiteOrcamentarioMinutos}
            />
          )}
        </div>
      </div>
    </div>
  );
}
