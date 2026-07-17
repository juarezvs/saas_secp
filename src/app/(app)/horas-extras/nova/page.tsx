import { CalendarClock } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  buscarConfiguracaoAtivaHorasExtras,
  buscarRascunhoHorasExtrasDoUsuario,
  buscarServidorSolicitanteHorasExtras,
} from "@/modules/horas-extras/infrastructure/repositories/horas-extras-solicitacao.repository";
import { HorasExtrasSolicitacaoForm } from "@/modules/horas-extras/presentation/components/horas-extras-solicitacao-form";

type NovaHorasExtrasPageProps = {
  searchParams?: Promise<{
    rascunho?: string;
  }>;
};

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

export default async function NovaHorasExtrasPage({
  searchParams,
}: NovaHorasExtrasPageProps) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "horas-extras:solicitar:proprio",
  );
  const params = await searchParams;
  const servidor = permissao.usuarioId
    ? await buscarServidorSolicitanteHorasExtras(permissao.usuarioId)
    : null;
  const configuracao = servidor
    ? await buscarConfiguracaoAtivaHorasExtras({
        orgaoId: servidor.orgaoId,
        scopeUnitId: servidor.lotacoes[0]?.unidadeId ?? null,
        dataReferencia: new Date(),
      })
    : null;
  const limitesPorTipoDia =
    configuracao?.policyVersion?.rateRules.reduce<Record<string, number>>(
      (acc, regra) => {
        if (regra.dailyLimitMinutes !== null) {
          acc[regra.dayType] = regra.dailyLimitMinutes;
        }

        return acc;
      },
      {},
    ) ?? {};
  const rascunho =
    params?.rascunho && permissao.usuarioId
      ? await buscarRascunhoHorasExtrasDoUsuario({
          requestId: params.rascunho,
          usuarioId: permissao.usuarioId,
        })
      : null;
  const valoresIniciais = rascunho
    ? {
        requestId: rascunho.id,
        periodStart: rascunho.periodStart.toISOString().slice(0, 10),
        periodEnd: rascunho.periodEnd.toISOString().slice(0, 10),
        justification: rascunho.justification,
        activitiesDescription: rascunho.activitiesDescription,
        days: rascunho.days.map((day) => ({
          date: day.date.toISOString().slice(0, 10),
          requestedTime: formatarMinutos(day.requestedMinutes),
          paymentDestination:
            day.paymentDestination === "BANCO_DE_HORAS"
              ? ("BANCO_DE_HORAS" as const)
              : ("PECUNIA" as const),
        })),
      }
    : undefined;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Horas extras", href: "/horas-extras" },
          { label: rascunho ? "Continuar rascunho" : "Nova solicitação" },
        ]}
      />

      <PageHeader
        icon={CalendarClock}
        titulo={rascunho ? "Continuar rascunho" : "Nova solicitação de horas extras"}
        descricao="Informe o período, a justificativa, as atividades e o tempo previsto por dia para iniciar a tramitação do serviço extraordinário."
      />

      <HorasExtrasSolicitacaoForm
        limitesPorTipoDia={limitesPorTipoDia}
        valoresIniciais={valoresIniciais}
      />
    </div>
  );
}
