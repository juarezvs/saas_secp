import { UsersRound } from "lucide-react";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarMinhaEquipe } from "@/modules/minha-equipe/infrastructure/repositories/minha-equipe.repository";
import type { MinhaEquipeDados } from "@/modules/minha-equipe/infrastructure/repositories/minha-equipe.repository";
import { MinhaEquipeFiltros } from "@/modules/minha-equipe/presentation/components/minha-equipe-filtros";
import { MinhaEquipeGrid } from "@/modules/minha-equipe/presentation/components/minha-equipe-grid";

type MinhaEquipePageProps = {
  searchParams?: Promise<{
    data?: string;
    unidadeId?: string | string[];
  }>;
};

function hojeManaus() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const porTipo = new Map(partes.map((parte) => [parte.type, parte.value]));

  return `${porTipo.get("year")}-${porTipo.get("month")}-${porTipo.get("day")}`;
}

function normalizarData(valor?: string) {
  return valor?.match(/^\d{4}-\d{2}-\d{2}$/) ? valor : hojeManaus();
}

function parseDataReferencia(valor: string) {
  return new Date(`${valor}T00:00:00.000Z`);
}

function normalizarUnidades(valor?: string | string[]) {
  if (!valor) return [];

  return Array.isArray(valor) ? valor : [valor];
}

function formatarPercentual(valor: number, total: number) {
  if (total === 0) return "0%";

  return `${((valor / total) * 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

export default async function MinhaEquipePage({
  searchParams,
}: MinhaEquipePageProps) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "minha-equipe:consultar:chefia",
  );
  const perfilAtivoCodigo = permissao.perfilAtivoCodigo?.toUpperCase() ?? "";
  const visualizarTodasEquipes = perfilAtivoCodigo !== "CHEFIA";

  const session = await auth();
  const params = searchParams ? await searchParams : {};
  const data = normalizarData(params.data);
  const unidadeIds = normalizarUnidades(params.unidadeId);
  const dadosVazios: MinhaEquipeDados = {
    escopo: visualizarTodasEquipes ? "global" : "chefia",
    unidades: [],
    unidadesSelecionadas: [],
    servidores: [],
    resumo: { total: 0, presentes: 0, ausentes: 0, afastados: 0 },
  };
  const dados = session?.user
    ? await buscarMinhaEquipe({
        usuarioId: session.user.id,
        data: parseDataReferencia(data),
        unidadeIds,
        visualizarTodasEquipes,
      })
    : dadosVazios;
  const percentualPresentes = formatarPercentual(
    dados.resumo.presentes,
    dados.resumo.total,
  );
  const percentualAusentes = formatarPercentual(
    dados.resumo.ausentes,
    dados.resumo.total,
  );
  const percentualAfastados = formatarPercentual(
    dados.resumo.afastados,
    dados.resumo.total,
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Minha Equipe" }]} />

      <PageHeader
        icon={UsersRound}
        titulo="Minha Equipe"
        descricao={
          visualizarTodasEquipes
            ? "Acompanhe a presença diária de todas as equipes, com filtros compactos por departamento."
            : "Acompanhe a presença diária dos servidores hierarquicamente subordinados à sua chefia, incluindo unidades delegadas."
        }
      />

      <MinhaEquipeFiltros
        data={data}
        escopo={dados.escopo}
        resumo={dados.resumo}
        unidades={dados.unidades}
        unidadesSelecionadas={dados.unidadesSelecionadas}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Servidores
          </p>
          <p className="mt-2 text-3xl font-bold">{dados.resumo.total}</p>
        </div>
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-green-800 shadow-card dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          <p className="text-xs font-semibold uppercase">Presentes</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-3xl font-bold">{dados.resumo.presentes}</p>
            <p className="text-sm font-bold">{percentualPresentes}</p>
          </div>
        </div>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800 shadow-card dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <p className="text-xs font-semibold uppercase">Ausentes</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-3xl font-bold">{dados.resumo.ausentes}</p>
            <p className="text-sm font-bold">{percentualAusentes}</p>
          </div>
        </div>
        <div className="rounded-md border border-orange-200 bg-orange-50 p-4 text-orange-800 shadow-card dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">
          <p className="text-xs font-semibold uppercase">Licenças</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-3xl font-bold">{dados.resumo.afastados}</p>
            <p className="text-sm font-bold">{percentualAfastados}</p>
          </div>
        </div>
      </section>

      <MinhaEquipeGrid servidores={dados.servidores} />
    </div>
  );
}
