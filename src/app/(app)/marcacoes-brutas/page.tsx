import { DatabaseZap } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarMarcacoesBrutasPaginado } from "@/modules/marcacoes-brutas/infrastructure/repositories/marcacao-bruta.repository";
import { MarcacoesBrutasListagemControles } from "@/modules/marcacoes-brutas/presentation/components/marcacoes-brutas-listagem-controles";
import { MarcacoesBrutasTable } from "@/modules/marcacoes-brutas/presentation/components/marcacoes-brutas-table";
import { ReprocessarMarcacoesBrutasForm } from "@/modules/marcacoes-brutas/presentation/components/reprocessar-marcacoes-brutas-form";
import { ReprocessarTodosForm } from "@/modules/marcacoes-brutas/presentation/components/reprocessar-todos-form";

type MarcacoesBrutasPageProps = {
  searchParams?: Promise<{
    busca?: string;
    origem?: string;
    processada?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

export default async function MarcacoesBrutasPage({
  searchParams,
}: MarcacoesBrutasPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "marcacoes:consultar:global",
    "marcacoes:gerenciar:global",
    "afd:importar:global",
  ]);

  const params = searchParams ? await searchParams : {};
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 20);

  const resultado = await listarMarcacoesBrutasPaginado({
    busca: params.busca,
    origem: params.origem,
    processada: params.processada,
    pagina,
    itensPorPagina,
  });

  const exportParams = new URLSearchParams();

  for (const chave of ["busca", "origem", "processada"] as const) {
    if (params[chave]) {
      exportParams.set(chave, params[chave]!);
    }
  }

  const baseParams = new URLSearchParams(exportParams);
  baseParams.set("itensPorPagina", String(resultado.itensPorPagina));

  function montarHrefPagina(novaPagina: number) {
    const query = new URLSearchParams(baseParams);
    query.set("pagina", String(novaPagina));
    return `/marcacoes-brutas?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Marcações Brutas" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Marcações brutas
        </p>

        <PageHeader
          icon={DatabaseZap}
          titulo="Fonte oficial das marcações"
          descricao="Consulte os registros brutos imutaveis recebidos por equipamento biométrico, importação AFD, registro web autorizado ou reconhecimento facial autorizado."
          artigo="Fonte oficial"
          regraTitulo="Registro bruto imutavel"
          regraDescricao="As marcações brutas preservam o dado original recebido pelo SECP. A marcação classificada usada na apuração é derivada deste registro."
        />
      </section>

      <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Reprocessamento</h2>

        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          Associe e processe novamente as marcações brutas pendentes. O sistema
          percorre automaticamente todos os lotes e preserva separadamente os
          registros bloqueados por cadastro, jornada ou homologação.
        </p>

        <ReprocessarMarcacoesBrutasForm rotuloBotao="Reprocessar pendentes" />
        <ReprocessarTodosForm />
      </section>

      <DataTableShell
        title="Marcações brutas"
        description="Fonte oficial e imutavel das marcações recebidas pelo SECP."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <MarcacoesBrutasListagemControles
            exportCsvHref={`/api/marcacoes-brutas/export?${exportParams.toString()}`}
            exportPdfHref={`/api/marcacoes-brutas/export/pdf?${exportParams.toString()}`}
          />
        }
      >
        <MarcacoesBrutasTable marcacoes={resultado.marcacoes} />
      </DataTableShell>
    </div>
  );
}
