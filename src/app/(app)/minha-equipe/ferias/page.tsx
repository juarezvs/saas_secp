import { CalendarDays } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  buscarCalendarioFeriasEquipe,
  listarIdsUnidadesSubordinadasNaData,
  type FeriasEquipeCalendarioDados,
} from "@/modules/minha-equipe/infrastructure/repositories/minha-equipe.repository";
import { FeriasEquipeCalendario } from "@/modules/minha-equipe/presentation/components/ferias-equipe-calendario";

type MinhaEquipeFeriasPageProps = {
  searchParams?: Promise<{
    data?: string;
    unidadeId?: string | string[];
    anoFerias?: string;
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

function normalizarAno(valor?: string) {
  const ano = Number(valor);

  if (Number.isInteger(ano) && ano >= 2000 && ano <= 2100) {
    return ano;
  }

  return new Date().getFullYear();
}

export default async function MinhaEquipeFeriasPage({
  searchParams,
}: MinhaEquipeFeriasPageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "programacao-ferias:consultar:subordinados",
    "programacao-ferias:consultar:seccional",
    "programacao-ferias:consultar:global",
    "minha-equipe:consultar:chefia",
  ]);
  const permissoes = new Set(permissao.permissoes);
  const perfilAtivoCodigo = permissao.perfilAtivoCodigo?.toUpperCase() ?? "";
  const visualizarTodasEquipes =
    permissoes.has("programacao-ferias:consultar:seccional") ||
    permissoes.has("programacao-ferias:consultar:global") ||
    (perfilAtivoCodigo !== "CHEFIA" &&
      !permissoes.has("programacao-ferias:consultar:subordinados"));
  const params = searchParams ? await searchParams : {};
  const data = normalizarData(params.data);
  const dataReferencia = parseDataReferencia(data);
  const anoFerias = normalizarAno(params.anoFerias);
  const unidadeIds = normalizarUnidades(params.unidadeId);
  const feriasVazias: FeriasEquipeCalendarioDados = {
    ano: anoFerias,
    escopo: visualizarTodasEquipes ? "global" : "chefia",
    itens: [],
    resumo: {
      periodos: 0,
      servidores: 0,
      mesMaisMovimentado: "-",
      maiorQuantidadeMes: 0,
    },
  };
  const idsSubordinados =
    !visualizarTodasEquipes && permissao.usuarioId
      ? await listarIdsUnidadesSubordinadasNaData({
          usuarioId: permissao.usuarioId,
          data: dataReferencia,
        })
      : [];
  const feriasEquipe = permissao.usuarioId
    ? await buscarCalendarioFeriasEquipe({
        usuarioId: permissao.usuarioId,
        ano: anoFerias,
        dataReferencia,
        unidadeIds,
        visualizarTodasEquipes,
        idsSubordinados,
      })
    : feriasVazias;
  const montarHrefAnoFerias = (ano: number) => {
    const query = new URLSearchParams();

    query.set("data", data);
    query.set("anoFerias", String(ano));

    for (const unidadeId of unidadeIds) {
      query.append("unidadeId", unidadeId);
    }

    return `/minha-equipe/ferias?${query.toString()}`;
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Minha Equipe", href: "/minha-equipe/presencas" },
          { label: "Programação de Férias" },
        ]}
      />

      <PageHeader
        icon={CalendarDays}
        titulo="Programação de Férias"
        descricao={
          visualizarTodasEquipes
            ? "Acompanhe a programação anual de férias de todas as equipes."
            : "Acompanhe a programação anual de férias da equipe subordinada à sua chefia."
        }
      />

      <FeriasEquipeCalendario
        dados={feriasEquipe}
        dataReferencia={data}
        unidadesSelecionadas={unidadeIds}
        montarHrefAno={montarHrefAnoFerias}
        actionPath="/minha-equipe/ferias"
      />
    </div>
  );
}
