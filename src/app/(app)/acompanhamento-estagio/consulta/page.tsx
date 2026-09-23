import Link from "next/link";
import { ClipboardList, Download, Eye, FileSpreadsheet, Search } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui";
import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiAlgumaPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import {
  PERMISSOES_ACOMPANHAMENTO_ESTAGIO,
  competenciaParaInputEstagio,
  listarAcompanhamentosEstagioConsulta,
  normalizarCompetenciaEstagio,
  type StatusAcompanhamentoEstagioView,
} from "@/modules/acompanhamento-estagio/application/services/acompanhamento-estagio.service";

type ConsultaAcompanhamentoEstagioProps = {
  searchParams?: Promise<{
    competencia?: string;
    busca?: string;
  }>;
};

const STATUS_LABEL: Record<StatusAcompanhamentoEstagioView, string> = {
  ABERTO: "Aberta",
  AGUARDANDO_SUPERVISOR: "Aguardando supervisor",
  DEVOLVIDO: "Devolvida",
  FECHADO: "Fechada",
};

export default async function ConsultaAcompanhamentoEstagioRoute({
  searchParams,
}: ConsultaAcompanhamentoEstagioProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    PERMISSOES_ACOMPANHAMENTO_ESTAGIO.consultarSeccional,
    PERMISSOES_ACOMPANHAMENTO_ESTAGIO.exportarSeccional,
  ]);
  const params = searchParams ? await searchParams : {};
  const { ano, mes } = normalizarCompetenciaEstagio(params);
  const competencia = competenciaParaInputEstagio(ano, mes);
  const busca = params.busca ?? "";
  const itens = await listarAcompanhamentosEstagioConsulta({
    ano,
    mes,
    busca,
    orgaoIds: permissao.orgaoIds,
    escopoGlobal: permissao.perfilAtivoEscopoGlobal,
  });
  const podeExportar = usuarioPossuiAlgumaPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    [PERMISSOES_ACOMPANHAMENTO_ESTAGIO.exportarSeccional],
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Acompanhamento mensal de estagio", href: "/acompanhamento-estagio" },
          { label: "Consulta" },
        ]}
      />

      <PageHeader
        icon={ClipboardList}
        titulo="Consulta de acompanhamento de estagio"
        descricao="Filtre estagiarios da seccional para visualizar frequencia e relatorio de atividades."
        regraTitulo="Acompanhamento pela area de estagio"
        regraDescricao="A consulta e exportacao usam o escopo do perfil ativo e nao liberam edicao do acompanhamento."
      />

      <Card className="p-4">
        <form className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-end">
          <div className="grid gap-2">
            <label htmlFor="competencia" className="text-sm font-semibold">
              Competencia
            </label>
            <input
              id="competencia"
              name="competencia"
              type="month"
              defaultValue={competencia}
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="busca" className="text-sm font-semibold">
              Estagiario
            </label>
            <input
              id="busca"
              name="busca"
              defaultValue={busca}
              placeholder="Nome ou matricula"
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-[var(--muted)]"
          >
            <Search className="size-4" aria-hidden="true" />
            Filtrar
          </button>
        </form>
      </Card>

      <section className="overflow-hidden rounded-md border bg-[var(--card)]">
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold">Estagiarios encontrados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {itens.length} registro(s) na competencia selecionada.
          </p>
        </div>

        {itens.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-[var(--muted)] text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Estagiario</th>
                  <th className="px-4 py-3 font-semibold">Lotacao</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Horas</th>
                  <th className="px-4 py-3 text-right font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => {
                  const query = new URLSearchParams({
                    competencia,
                    servidorId: item.servidorId,
                  }).toString();

                  return (
                    <tr key={item.servidorId} className="align-top">
                      <td className="border-t px-4 py-3">
                        <div className="font-semibold">{item.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.matricula} - {item.orgao}
                        </div>
                      </td>
                      <td className="border-t px-4 py-3">{item.lotacao}</td>
                      <td className="border-t px-4 py-3">
                        <span className="inline-flex rounded-md bg-[var(--muted)] px-2 py-1 text-xs font-semibold">
                          {STATUS_LABEL[item.status]}
                        </span>
                      </td>
                      <td className="border-t px-4 py-3 font-mono">
                        {item.totalHoras}
                      </td>
                      <td className="border-t px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/acompanhamento-estagio?${query}`}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-[var(--muted)]"
                          >
                            <Eye className="size-4" aria-hidden="true" />
                            Abrir
                          </Link>
                          {podeExportar ? (
                            <>
                              <Link
                                href={`/api/acompanhamento-estagio/pdf?${query}`}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-[var(--muted)]"
                              >
                                <Download className="size-4" aria-hidden="true" />
                                PDF
                              </Link>
                              <Link
                                href={`/api/acompanhamento-estagio/excel?${query}`}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-[var(--muted)]"
                              >
                                <FileSpreadsheet
                                  className="size-4"
                                  aria-hidden="true"
                                />
                                Excel
                              </Link>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum estagiario encontrado para os filtros informados.
          </div>
        )}
      </section>
    </div>
  );
}
