import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarOrgaosAtivos } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { listarServidoresPaginado } from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { ServidoresListagemControles } from "@/modules/servidores/presentation/components/servidores-listagem-controles";
import { ServidoresItensPorPagina } from "@/modules/servidores/presentation/components/servidores-itens-por-pagina";
import { PageHeader } from "@/components/layout/page-header";

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

  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);

  const [orgaos, resultado] = await Promise.all([
    listarOrgaosAtivos(),
    listarServidoresPaginado({
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
    }),
  ]);

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
            artigo="Arts. 4º, 8º, 16 e 19"
            regraTitulo="Servidor, jornada, frequência e consulta"
            regraDescricao="O cadastro funcional sustenta a jornada, a apuração mensal, o banco de horas, a homologação pela chefia e a consulta da própria frequência pelo servidor."
            // actions={
            //   <Link
            //     href="/servidores/novo"
            //     className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            //   >
            //     Novo servidor
            //   </Link>
            // }
          />
        </div>
        <Link
          href="/servidores/novo"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo servidor
        </Link>
      </section>

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <ServidoresListagemControles
          orgaos={orgaos}
          exportCsvHref={`/api/servidores/export?${exportParams.toString()}`}
          exportPdfHref={`/api/servidores/export/pdf?${exportParams.toString()}`}
        />

        <div className="flex flex-col justify-between gap-3 border-b p-5 md:flex-row md:items-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            {resultado.total} registro(s) encontrado(s)
          </p>

          <ServidoresItensPorPagina itensPorPagina={resultado.itensPorPagina} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Matrícula</th>
                <th className="px-5 py-3">CPF</th>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Órgão</th>
                <th className="px-5 py-3">Vínculo</th>
                <th className="px-5 py-3">Lotação atual</th>
                <th className="px-5 py-3">Lotações</th>
                <th className="px-5 py-3">Gestões</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {resultado.servidores.map((servidor) => {
                const lotacaoAtual = servidor.lotacoes[0];

                return (
                  <tr key={servidor.id} className="border-b last:border-b-0">
                    <td className="px-5 py-4 font-mono text-xs font-semibold">
                      {servidor.matricula}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs">
                      {servidor.cpf ?? servidor.usuario.cpf ?? "-"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold">
                        {servidor.usuario.nome}
                      </div>

                      {servidor.usuario.email && (
                        <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {servidor.usuario.email}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">{servidor.orgao.sigla}</td>

                    <td className="px-5 py-4 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                      {servidor.vinculo}
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
                        className="text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
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

        <div className="flex flex-col justify-between gap-3 border-t p-5 md:flex-row md:items-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            Página {resultado.pagina} de {resultado.totalPaginas}
          </p>

          <div className="flex gap-2">
            <Link
              href={montarHrefPagina(Math.max(resultado.pagina - 1, 1))}
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                resultado.pagina <= 1
                  ? "pointer-events-none opacity-50"
                  : "hover:bg-[var(--muted)]"
              }`}
            >
              Anterior
            </Link>

            <Link
              href={montarHrefPagina(
                Math.min(resultado.pagina + 1, resultado.totalPaginas),
              )}
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                resultado.pagina >= resultado.totalPaginas
                  ? "pointer-events-none opacity-50"
                  : "hover:bg-(--muted)"
              }`}
            >
              Próxima
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
