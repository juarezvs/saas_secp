import { Activity } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarAutorizacoesHorasExtrasParaExecucao } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-execucao.repository";

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data);
}

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${horas}h${String(resto).padStart(2, "0")}`;
}

function labelStatus(status: string) {
  const labels: Record<string, string> = {
    SEM_APURACAO: "Sem apuração",
    PENDENTE: "Pendente",
    EXECUTADO: "Executado",
    EXECUTADO_PARCIAL: "Executado parcialmente",
    EXCEDENTE: "Excedente",
  };

  return labels[status] ?? status;
}

export default async function ExecucaoHorasExtrasPage() {
  const permissao = await exigirPermissaoOuRedirecionar(
    "horas-extras:visualizar-execucao:global",
  );
  let autorizacoes: Awaited<
    ReturnType<typeof listarAutorizacoesHorasExtrasParaExecucao>
  > = [];
  let erroConsulta: string | null = null;

  try {
    autorizacoes = await listarAutorizacoesHorasExtrasParaExecucao({
      orgaoIds: permissao.orgaoIds,
      escopoGlobal: permissao.perfilAtivoEscopoGlobal,
    });
  } catch (error) {
    erroConsulta =
      error instanceof Error
        ? error.message
        : "Não foi possível consultar as autorizações.";
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Horas extras", href: "/horas-extras" },
          { label: "Execução" },
        ]}
      />

      <PageHeader
        icon={Activity}
        titulo="Execução de horas extras"
        descricao="Acompanhamento das autorizações ativas com base na apuração diária do ponto."
      />

      <Card>
        <CardHeader>
          <CardTitle>Autorizações ativas</CardTitle>
        </CardHeader>
        <CardContent>
          {erroConsulta ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              {erroConsulta}
            </div>
          ) : autorizacoes.length > 0 ? (
            <div className="space-y-4">
              {autorizacoes.map((item) => (
                <div
                  key={item.authorization.id}
                  className="rounded-md border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {item.servidor
                          ? `${item.servidor.matricula} - ${item.servidor.nome}`
                          : item.authorization.employeeId}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.authorization.request.requestNumber} ·{" "}
                        {formatarData(item.authorization.validFrom)} a{" "}
                        {formatarData(item.authorization.validUntil)}
                      </p>
                      {item.servidor?.unidade && (
                        <p className="text-xs text-muted-foreground">
                          {item.servidor.orgao} · {item.servidor.unidade}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-right text-sm md:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Autorizado</p>
                        <p className="font-semibold">
                          {formatarMinutos(item.totais.approvedMinutes)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Executado</p>
                        <p className="font-semibold text-emerald-700">
                          {formatarMinutos(item.totais.executedMinutes)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pendente</p>
                        <p className="font-semibold">
                          {formatarMinutos(item.totais.pendingMinutes)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Excedente</p>
                        <p className="font-semibold text-amber-700">
                          {formatarMinutos(item.totais.excessMinutes)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="border-b text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-2 py-2 text-left">Data</th>
                          <th className="px-2 py-2 text-right">Autorizado</th>
                          <th className="px-2 py-2 text-right">Executado</th>
                          <th className="px-2 py-2 text-right">Pendente</th>
                          <th className="px-2 py-2 text-right">Excedente</th>
                          <th className="px-2 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {item.diasExecucao.map((day) => (
                          <tr key={day.authorizationDayId}>
                            <td className="px-2 py-2">{formatarData(day.date)}</td>
                            <td className="px-2 py-2 text-right">
                              {formatarMinutos(day.approvedMinutes)}
                            </td>
                            <td className="px-2 py-2 text-right">
                              {formatarMinutos(day.executedMinutes)}
                            </td>
                            <td className="px-2 py-2 text-right">
                              {formatarMinutos(day.pendingMinutes)}
                            </td>
                            <td className="px-2 py-2 text-right">
                              {formatarMinutos(day.excessMinutes)}
                            </td>
                            <td className="px-2 py-2">
                              {labelStatus(day.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma autorização ativa localizada.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
