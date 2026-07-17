import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarLotesFolhaHorasExtras,
  listarOrgaosParaLoteHorasExtras,
} from "@/modules/horas-extras/infrastructure/repositories/horas-extras-folha.repository";
import { HorasExtrasGerarLoteForm } from "@/modules/horas-extras/presentation/components/horas-extras-gerar-lote-form";

function formatarDataHora(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${horas}h${String(resto).padStart(2, "0")}`;
}

export default async function FolhaHorasExtrasPage() {
  const permissao = await exigirPermissaoOuRedirecionar(
    "horas-extras:visualizar-folha:global",
  );
  const podeGerar =
    permissao.permissoes?.includes("horas-extras:gerar-lote:global") ?? false;
  let lotes: Awaited<ReturnType<typeof listarLotesFolhaHorasExtras>> = [];
  let orgaos: Awaited<ReturnType<typeof listarOrgaosParaLoteHorasExtras>> = [];
  let erroConsulta: string | null = null;

  try {
    [lotes, orgaos] = await Promise.all([
      listarLotesFolhaHorasExtras({
        orgaoIds: permissao.orgaoIds,
        escopoGlobal: permissao.perfilAtivoEscopoGlobal,
      }),
      listarOrgaosParaLoteHorasExtras({
        orgaoIds: permissao.orgaoIds,
        escopoGlobal: permissao.perfilAtivoEscopoGlobal,
      }),
    ]);
  } catch (error) {
    erroConsulta =
      error instanceof Error ? error.message : "Não foi possível consultar os lotes.";
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Horas extras", href: "/horas-extras" },
          { label: "Folha" },
        ]}
      />

      <PageHeader
        icon={FileSpreadsheet}
        titulo="Folha de horas extras"
        descricao="Geração e conferência dos lotes de pagamento de serviço extraordinário."
      />

      {podeGerar && <HorasExtrasGerarLoteForm orgaos={orgaos} />}

      <Card>
        <CardHeader>
          <CardTitle>Lotes recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {erroConsulta ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              {erroConsulta}
            </div>
          ) : lotes.length > 0 ? (
            <div className="divide-y rounded-md border">
              {lotes.map((lote) => (
                <Link
                  key={lote.id}
                  href={`/folha/horas-extras/${lote.id}`}
                  className="block p-4 transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">
                      Competência {lote.competence}
                    </p>
                    <span className="rounded bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {lote.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lote.totalEmployees} servidor(es),{" "}
                    {formatarMinutos(lote.totalMinutes)} · gerado em{" "}
                    {formatarDataHora(lote.createdAt)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum lote de horas extras localizado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
