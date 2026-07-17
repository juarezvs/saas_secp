import { SlidersHorizontal } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarConfiguracaoHorasExtras,
  listarUnidadesParaConfiguracaoHorasExtras,
} from "@/modules/horas-extras/infrastructure/repositories/horas-extras-config.repository";
import { listarOrgaosParaLoteHorasExtras } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-folha.repository";
import { HorasExtrasPoliticaForm } from "@/modules/horas-extras/presentation/components/horas-extras-politica-form";

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data);
}

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function limiteDiario(
  versao: {
    rateRules: Array<{
      dayType: string;
      dailyLimitMinutes: number | null;
    }>;
  },
  dayType: string,
) {
  return (
    versao.rateRules.find((rule) => rule.dayType === dayType)
      ?.dailyLimitMinutes ?? 0
  );
}

function rotuloEscopo(item: {
  orgao?: { sigla: string } | null;
  scopeUnit?: { sigla: string; nome: string } | null;
}) {
  if (item.scopeUnit) {
    return `${item.orgao?.sigla ?? "Órgão"} / ${item.scopeUnit.sigla} - ${item.scopeUnit.nome}`;
  }

  return `${item.orgao?.sigla ?? "Órgão"} / Geral do órgão`;
}

export default async function AdministracaoHorasExtrasPage() {
  const permissao = await exigirPermissaoOuRedirecionar(
    "horas-extras:configurar-politica:global",
  );
  const [orgaos, unidades, configuracao] = await Promise.all([
    listarOrgaosParaLoteHorasExtras({
      orgaoIds: permissao.orgaoIds,
      escopoGlobal: permissao.perfilAtivoEscopoGlobal,
    }),
    listarUnidadesParaConfiguracaoHorasExtras({
      orgaoIds: permissao.orgaoIds,
      escopoGlobal: permissao.perfilAtivoEscopoGlobal,
    }),
    listarConfiguracaoHorasExtras({
      orgaoIds: permissao.orgaoIds,
      escopoGlobal: permissao.perfilAtivoEscopoGlobal,
    }),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Horas extras" },
        ]}
      />

      <PageHeader
        icon={SlidersHorizontal}
        titulo="Configuração de horas extras"
        descricao="Políticas e fluxos versionados por órgão/seccional."
      />

      <HorasExtrasPoliticaForm orgaos={orgaos} unidades={unidades} />

      <Card>
        <CardHeader>
          <CardTitle>Políticas ativas</CardTitle>
        </CardHeader>
        <CardContent>
          {configuracao.policies.length > 0 ? (
            <div className="divide-y rounded-md border">
              {configuracao.policies.map((policy) => {
                const versao = policy.versions[0];

                return (
                  <div key={policy.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{policy.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {rotuloEscopo(policy)}
                        </p>
                      </div>
                      <span className="rounded bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                        v{versao?.version ?? "-"}
                      </span>
                    </div>
                    {versao && (
                      <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-4">
                        <p>Vigência: {formatarData(versao.validFrom)}</p>
                        <p>
                          Dia útil:{" "}
                          {formatarMinutos(limiteDiario(versao, "DIA_UTIL"))}
                        </p>
                        <p>
                          Mensal:{" "}
                          {formatarMinutos(versao.monthlyLimitMinutes ?? 0)}
                        </p>
                        <p>
                          Anual: {formatarMinutos(versao.annualLimitMinutes ?? 0)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma política ativa localizada.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fluxos ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {configuracao.workflows.length > 0 ? (
            <div className="divide-y rounded-md border">
              {configuracao.workflows.map((workflow) => {
                const versao = workflow.versions[0];

                return (
                  <div key={workflow.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{workflow.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {rotuloEscopo(workflow)}
                        </p>
                      </div>
                      <span className="rounded bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                        v{versao?.version ?? "-"}
                      </span>
                    </div>
                    {versao && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {versao.steps.map((step) => step.name).join(" -> ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum fluxo ativo localizado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
