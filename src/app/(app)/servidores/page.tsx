import Link from "next/link";
import Image from "next/image";
import { Plus, Users } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  aplicarEscopoOrgaoId,
  obterEscopoOrgaoDaSessao,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import {
  buscarFotosServidoresDataUrl,
  normalizarCpfFoto,
} from "@/modules/servidores/application/services/foto-servidor.service";
import {
  descricaoCargoServidor,
  descricaoFuncaoServidor,
} from "@/modules/servidores/application/services/funcao-cargo-servidor.service";
import { listarOrgaosAtivos } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { listarServidoresPaginado } from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { ServidoresListagemControles } from "@/modules/servidores/presentation/components/servidores-listagem-controles";

type ServidoresPageProps = {
  searchParams?: Promise<{
    busca?: string;
    matricula?: string;
    cpf?: string;
    nome?: string;
    orgaoId?: string;
    vinculo?: string;
    lotacao?: string;
    status?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

export default async function ServidoresPage({
  searchParams,
}: ServidoresPageProps) {
  await exigirPermissaoOuRedirecionar("servidores:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);
  const filtrosEscopados = aplicarEscopoOrgaoId(
    {
      busca: params.busca ?? "",
      matricula: params.matricula ?? "",
      cpf: params.cpf ?? "",
      nome: params.nome ?? "",
      orgaoId: params.orgaoId ?? "",
      vinculo: params.vinculo ?? "",
      lotacao: params.lotacao ?? "",
      status: params.status ?? "",
      pagina,
      itensPorPagina,
    },
    escopoOrgao,
  );

  const [orgaos, resultado] = await Promise.all([
    listarOrgaosAtivos(
      aplicarEscopoOrgaoId({ orgaoId: "" }, escopoOrgao),
    ),
    listarServidoresPaginado(filtrosEscopados),
  ]);
  const fotosServidores = await buscarFotosServidoresDataUrl(
    resultado.servidores.map(
      (servidor) => servidor.cpf ?? servidor.usuario.cpf,
    ),
  );

  const exportParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "matricula",
    "cpf",
    "nome",
    "orgaoId",
    "vinculo",
    "lotacao",
    "status",
  ] as const) {
    if (params[chave]) {
      exportParams.set(chave, params[chave]!);
    }
  }

  const baseParams = new URLSearchParams(exportParams);
  baseParams.set("itensPorPagina", String(resultado.itensPorPagina));

  function montarHrefPagina(novaPagina: number) {
    const query = new URLSearchParams(baseParams);
    query.set("pagina", String(novaPagina));
    return `/servidores?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Servidores" },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Cadastro funcional
          </p>

          <PageHeader
            icon={Users}
            titulo="Servidores"
            descricao="Gerencie servidores, vínculos funcionais, usuários relacionados e lotações em unidades organizacionais."
            artigo="Arts. 4, 8, 16 e 19"
            regraTitulo="Servidor, jornada, frequência e consulta"
            regraDescricao="O cadastro funcional sustenta a jornada, a apuração mensal, o banco de horas, a homologação pela chefia e a consulta da própria frequência pelo servidor."
          />
        </div>

        <Link
          href="/servidores/novo"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo servidor
        </Link>
      </section>

      <DataTableShell
        title="Servidores cadastrados"
        description="Use a pesquisa geral ou filtre diretamente pelas colunas da tabela."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <ServidoresListagemControles
            orgaos={orgaos}
            exportCsvHref={`/api/servidores/export?${exportParams.toString()}`}
            exportPdfHref={`/api/servidores/export/pdf?${exportParams.toString()}`}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <caption className="sr-only">
              Listagem de servidores com matrícula, CPF, nome, órgão, vínculo,
              lotação atual, contadores, status e ações.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Matrícula</th>
                <th className="px-5 py-3">CPF</th>
                <th className="px-5 py-3">Servidor</th>
                <th className="px-5 py-3">Órgão</th>
                <th className="px-5 py-3">Vínculo</th>
                <th className="px-5 py-3">Lotação atual</th>
                <th className="px-5 py-3">Lotações</th>
                <th className="px-5 py-3">Gestoes</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {resultado.servidores.map((servidor) => {
                const lotacaoAtual = servidor.lotacoes[0];
                const fotoCpf = servidor.cpf ?? servidor.usuario.cpf;
                const fotoSrc = fotoCpf
                  ? fotosServidores.get(normalizarCpfFoto(fotoCpf) ?? "")
                  : null;
                const cargo = descricaoCargoServidor(servidor);
                const funcao = descricaoFuncaoServidor(servidor);

                return (
                  <tr key={servidor.id} className="border-b last:border-b-0">
                    <td className="px-5 py-4 font-mono text-xs font-semibold">
                      {servidor.matricula}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {servidor.cpf ?? servidor.usuario.cpf ?? "-"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {fotoSrc ? (
                          <Image
                            src={fotoSrc}
                            alt=""
                            width={64}
                            height={64}
                            unoptimized
                            className="size-16 rounded-full border-2 border-white bg-slate-100 object-cover shadow-sm ring-2 ring-blue-100 dark:border-slate-950 dark:bg-slate-800 dark:ring-blue-900/60"
                          />
                        ) : (
                          <span className="flex size-16 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-sm font-bold text-slate-600 shadow-sm ring-2 ring-blue-100 dark:border-slate-950 dark:bg-slate-800 dark:text-slate-300 dark:ring-blue-900/60">
                            {servidor.matricula.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold">
                            {nomeServidor(servidor)}
                          </div>
                          {cargo && (
                            <div className="mt-1 max-w-72 truncate text-xs text-[var(--muted-foreground)]">
                              {cargo}
                            </div>
                          )}
                          {funcao && (
                            <div className="mt-1 max-w-72 truncate text-xs font-semibold text-blue-900 dark:text-blue-300">
                              {funcao}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">{servidor.orgao.sigla}</td>
                    <td className="px-5 py-4 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                      <div>{servidor.vinculo}</div>
                      {servidor.descricaoProvimentoSarh && (
                        <div className="mt-1 max-w-32 truncate text-[10px] normal-case text-[var(--muted-foreground)]">
                          {servidor.descricaoProvimentoSarh}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {lotacaoAtual ? lotacaoAtual.unidade.sigla : "-"}
                    </td>
                    <td className="px-5 py-4">{servidor._count.lotacoes}</td>
                    <td className="px-5 py-4">{servidor._count.gestores}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          servidor.ativo
                            ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {servidor.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/servidores/${servidor.id}`}
                        className="text-sm font-semibold text-blue-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-blue-300"
                      >
                        Detalhar
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {resultado.servidores.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum servidor encontrado para os filtros informados.
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
