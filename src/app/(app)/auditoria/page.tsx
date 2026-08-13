import { ScrollText, Eye } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarEntidadesAuditoria,
  listarEventosAuditoria,
  listarUsuariosParaFiltroAuditoria,
} from "@/modules/auditoria/infrastructure/repositories/auditoria.repository";
import { AuditoriaListagemControles } from "@/modules/auditoria/presentation/components/auditoria-listagem-controles";
import {
  formatarDataHoraAuditoria,
  rotuloEntidadeAuditoria,
} from "@/modules/auditoria/application/services/formatar-auditoria.service";

type AuditoriaPageProps = {
  searchParams?: Promise<{
    pagina?: string;
    itensPorPagina?: string;
    limite?: string;
    busca?: string;
    entidade?: string;
    acao?: string;
    usuarioId?: string;
    dataInicio?: string;
    dataFim?: string;
  }>;
};

export default async function AuditoriaPage({
  searchParams,
}: AuditoriaPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "auditoria:consultar:seccional",
    "auditoria:detalhar:seccional",
    "auditoria:consultar:global",
    "auditoria:detalhar:global",
  ]);

  const params = searchParams ? await searchParams : {};
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds;
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? params.limite ?? 20);

  const [resultado, usuarios, entidades] = await Promise.all([
    listarEventosAuditoria({
      pagina,
      itensPorPagina,
      busca: params.busca,
      entidade: params.entidade,
      acao: params.acao,
      usuarioId: params.usuarioId,
      dataInicio: params.dataInicio,
      dataFim: params.dataFim,
      orgaoIdsPermitidos,
    }),
    listarUsuariosParaFiltroAuditoria({ orgaoIdsPermitidos }),
    listarEntidadesAuditoria({ orgaoIdsPermitidos }),
  ]);

  const exportParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "entidade",
    "acao",
    "usuarioId",
    "dataInicio",
    "dataFim",
  ] as const) {
    if (params[chave]) {
      exportParams.set(chave, params[chave]!);
    }
  }

  const baseParams = new URLSearchParams(exportParams);
  baseParams.set("itensPorPagina", String(resultado.paginacao.itensPorPagina));

  function montarHrefPagina(novaPagina: number) {
    const query = new URLSearchParams(baseParams);
    query.set("pagina", String(novaPagina));
    return `/auditoria?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Auditoria" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Auditoria e trilhas de controle
        </p>

        <PageHeader
          icon={ScrollText}
          titulo="Eventos de auditoria"
          descricao="Consulte ações sensíveis realizadas no SECP, incluindo marcações, solicitações, apuracoes, banco de horas, homologações, boletins, usuários e perfis."
          artigo="Governança, controle eletrônico e responsabilidade"
          regraTitulo="Rastreabilidade das ações"
          regraDescricao="A auditoria registra quem realizou cada ação, quando ocorreu, qual entidade foi afetada e quais dados foram alterados, apoiando a responsabilizacao administrativa e a integridade do controle de frequência."
        />
      </section>

      <DataTableShell
        title="Eventos de auditoria"
        description="Use os filtros para localizar eventos por entidade, ação, usuário ou período."
        total={resultado.paginacao.total}
        pagina={resultado.paginacao.pagina}
        totalPaginas={resultado.paginacao.totalPaginas}
        itensPorPagina={resultado.paginacao.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <AuditoriaListagemControles
            usuarios={usuarios}
            entidades={entidades}
            exportCsvHref={`/api/auditoria/export?${exportParams.toString()}`}
            exportPdfHref={`/api/auditoria/export/pdf?${exportParams.toString()}`}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <caption className="sr-only">
              Listagem de eventos de auditoria com data, usuário, entidade, ID,
              ação, IP e ações.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Data/hora</th>
                <th className="px-5 py-3">Usuário</th>
                <th className="px-5 py-3">Entidade</th>
                <th className="px-5 py-3">ID entidade</th>
                <th className="px-5 py-3">Ação</th>
                <th className="px-5 py-3">IP</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {resultado.eventos.map((evento) => (
                <tr key={evento.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4">
                    {formatarDataHoraAuditoria(evento.criadoEm)}
                  </td>
                  <td className="px-5 py-4">
                    {evento.usuario ? (
                      <>
                        <div className="font-semibold">
                          {evento.usuario.nome}
                        </div>
                        <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                          {evento.usuario.matricula}
                        </div>
                      </>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">
                        Sistema/sem usuário
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {rotuloEntidadeAuditoria(evento.entidade)}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">
                    {evento.entidadeId ?? "-"}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                      {evento.acao}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">
                    {evento.ip ?? "-"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <a
                      href={`/auditoria/${evento.id}`}
                      className="inline-flex items-center justify-end gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-blue-300"
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      Detalhar
                    </a>
                  </td>
                </tr>
              ))}

              {resultado.eventos.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum evento de auditoria encontrado para os filtros
                    informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}
