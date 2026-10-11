import { Landmark } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import {
  DataTablePageSize,
  DataTablePagination,
} from "@/components/listagens";
import {
  aplicarEscopoOrgaoId,
  obterEscopoOrgaoDaSessao,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarFusosHorariosAtivos } from "@/modules/fusos-horarios/infrastructure/repositories/fuso-horario.repository";
import {
  CAMPOS_ORDENACAO_ORGAOS,
  listarOrgaosPaginado,
  type CampoOrdenacaoOrgaos,
} from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { OrgaosDataTable } from "@/modules/orgaos/presentation/components/orgaos-data-table";
import { OrgaosListagemControles } from "@/modules/orgaos/presentation/components/orgaos-listagem-controles";

type OrgaosPageProps = {
  searchParams?: Promise<{
    busca?: string;
    sigla?: string;
    nome?: string;
    codigoExternoSarh?: string;
    status?: string;
    fusoHorario?: string;
    pagina?: string;
    itensPorPagina?: string;
    ordenarPor?: string;
    direcao?: string;
  }>;
};

export default async function OrgaosPage({ searchParams }: OrgaosPageProps) {
  await exigirPermissaoOuRedirecionar("unidades:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);
  const ordenarPor = CAMPOS_ORDENACAO_ORGAOS.includes(
    params.ordenarPor as CampoOrdenacaoOrgaos,
  )
    ? (params.ordenarPor as CampoOrdenacaoOrgaos)
    : "sigla";
  const direcao = params.direcao === "desc" ? "desc" : "asc";

  const [resultado, fusosHorarios] = await Promise.all([
    listarOrgaosPaginado(
      aplicarEscopoOrgaoId(
        {
          busca: params.busca ?? "",
          sigla: params.sigla ?? "",
          nome: params.nome ?? "",
          codigoExternoSarh: params.codigoExternoSarh ?? "",
          status: params.status ?? "",
          fusoHorario: params.fusoHorario ?? "",
          ordenarPor,
          direcao,
          pagina,
          itensPorPagina,
        },
        escopoOrgao,
      ),
    ),
    listarFusosHorariosAtivos(),
  ]);

  const exportParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "sigla",
    "nome",
    "codigoExternoSarh",
    "status",
    "fusoHorario",
  ] as const) {
    if (params[chave]) {
      exportParams.set(chave, params[chave]!);
    }
  }

  const baseParams = new URLSearchParams(exportParams);
  baseParams.set("itensPorPagina", String(resultado.itensPorPagina));
  baseParams.set("ordenarPor", ordenarPor);
  baseParams.set("direcao", direcao);

  function montarHrefPagina(novaPagina: number) {
    const query = new URLSearchParams(baseParams);
    query.set("pagina", String(novaPagina));
    return `/orgaos?${query.toString()}`;
  }

  return (
    <div className="space-y-3">
      <PageHeader
        icon={Landmark}
        titulo="Órgãos e seccionais"
        contexto={
          <Breadcrumb
            embedded
            items={[
              { label: "Administração", href: "/administracao" },
              { label: "Órgãos" },
            ]}
          />
        }
        variant="blade"
        artigo="Arts. 1, 3 e 20"
        regraTitulo="Abrangência institucional"
        regraDescricao="A estrutura de órgãos organiza a abrangência administrativa do SECP e sustenta cadastros funcionais, unidades organizacionais e sincronizações externas."
      />

      <section className="overflow-hidden border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)]">
        <div className="border-b border-[var(--border)] px-3 pt-1">
          <div className="inline-flex h-10 items-center border-b-2 border-[var(--secp-theme-accent)] px-2 text-sm font-semibold">
            Órgãos
            <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
              {resultado.total}
            </span>
          </div>
        </div>

        <OrgaosListagemControles
          permitirNovo={escopoOrgao.global}
          exportCsvHref={`/api/orgaos/export?${exportParams.toString()}`}
          exportPdfHref={`/api/orgaos/export/pdf?${exportParams.toString()}`}
          fusosHorarios={fusosHorarios}
          acoesDireita={
            <>
              <DataTablePageSize value={resultado.itensPorPagina} compact />
              <DataTablePagination
                pagina={resultado.pagina}
                totalPaginas={resultado.totalPaginas}
                montarHrefPagina={montarHrefPagina}
              />
            </>
          }
        />

        <OrgaosDataTable
          dados={resultado.orgaos}
          ordenarPor={ordenarPor}
          direcao={direcao}
        />
      </section>
    </div>
  );
}
