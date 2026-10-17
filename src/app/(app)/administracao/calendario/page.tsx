import { CalendarDays } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarCalendarioInstitucionalPaginado } from "@/modules/calendario-institucional/infrastructure/repositories/calendario-institucional.repository";
import { CalendarioInstitucionalListagem } from "@/modules/calendario-institucional/presentation/components/calendario-institucional-listagem";
import { CalendarioListagemControles } from "@/modules/calendario-institucional/presentation/components/calendario-listagem-controles";
import { ReplicarCalendarioInstitucionalForm } from "@/modules/calendario-institucional/presentation/components/replicar-calendario-institucional-form";
import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";

type CalendarioInstitucionalPageProps = {
  searchParams?: Promise<{
    busca?: string;
    tipo?: string;
    status?: string;
    ano?: string;
    mes?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

export default async function CalendarioInstitucionalPage({
  searchParams,
}: CalendarioInstitucionalPageProps) {
  await exigirPermissaoOuRedirecionar("configuracoes:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);

  const [resultado, tipos] = await Promise.all([
    listarCalendarioInstitucionalPaginado({
      busca: params.busca ?? "",
      tipo: params.tipo ?? "",
      status: params.status ?? "",
      ano: params.ano ?? "",
      mes: params.mes ?? "",
      pagina,
      itensPorPagina,
    }),
    prismaListagem.tipoFeriadoSuspensao.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const baseParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "tipo",
    "status",
    "ano",
    "mes",
  ] as const) {
    if (params[chave]) {
      baseParams.set(chave, params[chave]!);
    }
  }

  baseParams.set("itensPorPagina", String(resultado.itensPorPagina));

  function montarHrefPagina(novaPagina: number) {
    const query = new URLSearchParams(baseParams);
    query.set("pagina", String(novaPagina));
    return `/administracao/calendario?${query.toString()}`;
  }

  const redirectParams = new URLSearchParams(baseParams);
  redirectParams.set("pagina", String(resultado.pagina));
  const redirectTo = `/administracao/calendario?${redirectParams.toString()}`;

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { label: "Administracao", href: "/administracao" },
          { label: "Calendario institucional" },
        ]}
      />

      <PageHeader
        icon={CalendarDays}
        titulo="Calendario institucional"
        descricao="Cadastre os dias que alteram a rotina ordinaria do orgao, com reflexos em prazos regulamentares e na apuracao diaria do ponto."
        artigo="Arts. 16, 17 e fluxo institucional"
        regraTitulo="Prazos e expediente"
        regraDescricao="Feriados, pontos facultativos, suspensoes de expediente e recesso forense precisam refletir corretamente nos prazos de homologacao, boletim e na apuracao do ponto."
      />

      <ReplicarCalendarioInstitucionalForm
        anoAtual={Number(params.ano) || new Date().getFullYear()}
      />

      <DataTableShell
        title="Eventos cadastrados"
        description="Filtre por tipo, ano, mes, status e termos livres da descricao."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={<CalendarioListagemControles tipos={tipos} />}
      >
        <CalendarioInstitucionalListagem
          redirectTo={redirectTo}
          eventos={resultado.eventos.map((evento) => ({
            id: evento.id,
            dataReferencia: evento.dataReferencia.toISOString(),
            dataOriginal: evento.dataOriginal?.toISOString() ?? null,
            dataSubstituida: evento.dataSubstituida,
            tipo: evento.tipo,
            descricao: evento.descricao,
            observacao: evento.observacao,
            contaComoDiaUtil: evento.contaComoDiaUtil,
            geraApuracaoRegular: evento.geraApuracaoRegular,
            janelaInicio: evento.janelaInicio,
            janelaFim: evento.janelaFim,
            ativo: evento.ativo,
          }))}
        />
      </DataTableShell>
    </div>
  );
}
