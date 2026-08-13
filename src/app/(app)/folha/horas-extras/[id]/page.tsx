import Link from "next/link";
import { notFound } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { fecharLoteFolhaHorasExtrasAction } from "@/modules/horas-extras/application/actions/fechar-lote-folha-horas-extras.action";
import { buscarLoteFolhaHorasExtrasPorId } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-folha.repository";

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

function formatarValor(valor: { toString(): string }) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor.toString()));
}

export default async function FolhaHorasExtrasDetalhePage({ params }: PageProps) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "horas-extras:visualizar-folha:global",
  );
  const { id } = await params;
  const lote = await buscarLoteFolhaHorasExtrasPorId(id);

  if (!lote) {
    notFound();
  }

  if (
    !permissao.perfilAtivoEscopoGlobal &&
    permissao.orgaoIds?.length &&
    !permissao.orgaoIds.includes(lote.orgaoId)
  ) {
    notFound();
  }

  const podeFechar =
    permissao.permissoes?.includes("horas-extras:fechar-lote:global") ?? false;
  const podeExportar =
    permissao.permissoes?.includes("horas-extras:exportar:global") ?? false;
  const lotePodeFechar = ["PENDING_REVIEW", "READY_TO_CLOSE"].includes(lote.status);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Horas extras", href: "/horas-extras" },
          { label: "Folha", href: "/folha/horas-extras" },
          { label: lote.competence },
        ]}
      />

      <PageHeader
        icon={FileSpreadsheet}
        titulo={`Lote ${lote.competence}`}
        descricao={`${lote.totalEmployees} servidor(es), ${formatarMinutos(
          lote.totalMinutes,
        )}, ${formatarValor(lote.totalAmount)}.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm md:grid-cols-4">
            <p>
              <span className="font-semibold">Status:</span> {lote.status}
            </p>
            <p>
              <span className="font-semibold">Competência:</span> {lote.competence}
            </p>
            <p>
              <span className="font-semibold">Minutos:</span>{" "}
              {formatarMinutos(lote.totalMinutes)}
            </p>
            <p>
              <span className="font-semibold">Checksum:</span>{" "}
              {lote.checksum?.slice(0, 12) ?? "-"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {podeFechar && lotePodeFechar && (
              <form action={fecharLoteFolhaHorasExtrasAction}>
                <input type="hidden" name="batchId" value={lote.id} />
                <Button type="submit">Fechar lote</Button>
              </form>
            )}
            {podeExportar && (
              <Link
                href={`/api/horas-extras/folha/${lote.id}/export`}
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Exportar detalhado
              </Link>
            )}
            {podeExportar && (
              <Link
                href={`/api/horas-extras/folha/${lote.id}/export?layout=oficial`}
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Exportar folha
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Servidores e rubricas</CardTitle>
        </CardHeader>
        <CardContent>
          {lote.employees.length > 0 ? (
            <div className="space-y-4">
              {lote.employees.map((employee) => (
                <div key={employee.id} className="rounded-md border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">
                        {employee.registration} - {employee.employeeName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {employee.organizationalUnitLabel ?? "-"}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold">
                        {formatarMinutos(employee.totalMinutes)}
                      </p>
                      <p className="text-muted-foreground">
                        {formatarValor(employee.totalAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="border-b text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-2 py-2 text-left">Data</th>
                          <th className="px-2 py-2 text-left">Rubrica</th>
                          <th className="px-2 py-2 text-right">Adicional</th>
                          <th className="px-2 py-2 text-right">Minutos</th>
                          <th className="px-2 py-2 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {employee.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="px-2 py-2">{formatarData(line.date)}</td>
                            <td className="px-2 py-2">{line.rubricaCode ?? "-"}</td>
                            <td className="px-2 py-2 text-right">
                              {line.ratePercent.toString()}%
                            </td>
                            <td className="px-2 py-2 text-right">
                              {formatarMinutos(line.minutes)}
                            </td>
                            <td className="px-2 py-2 text-right">
                              {formatarValor(line.amount)}
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
              Nenhuma linha localizada para este lote.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
