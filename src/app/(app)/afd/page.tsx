import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { AfdUploadDropzone } from "@/modules/afd/presentation/components/afd-upload-dropzone";
import { AfdImportacoesTable } from "@/modules/afd/presentation/components/afd-importacoes-table";
import { listarImportacoesAfd } from "@/modules/afd/infrastructure/repositories/afd.repository";
import { reprocessarMarcacoesBrutasPendentesAction } from "@/modules/marcacoes-brutas/application/actions/reprocessar-marcacoes-brutas-pendentes.action";

export default async function AfdPage() {
  const importacoes = await listarImportacoesAfd();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Importação AFD" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Importação AFD
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Upload de arquivos AFD
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Envie arquivos AFD dos equipamentos biométricos para sincronizar
          marcações brutas oficiais, evitando duplicidades e enfileirando o
          processamento assíncrono.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Registro biométrico"
        titulo="Fonte oficial das marcações"
        descricao="Os arquivos AFD são importados como marcações brutas imutáveis e posteriormente processados para apuração de frequência."
      />

      <AfdUploadDropzone />

      <section className="rounded-xl border bg-(--card) p-5 text-(--card-foreground) shadow-sm">
        <h2 className="text-lg font-bold">Reprocessar pendências</h2>

        <p className="mt-2 text-sm leading-6 text-(--muted-foreground)">
          Use esta ação após cadastrar servidores que possuíam marcações brutas
          pendentes por CPF ou matrícula. O sistema tentará vincular e processar
          novamente as marcações ainda não processadas.
        </p>

        <form
          action={reprocessarMarcacoesBrutasPendentesAction}
          className="mt-4"
        >
          <button
            type="submit"
            className="rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-(--muted)"
          >
            Reprocessar marcações brutas pendentes
          </button>
        </form>
      </section>

      <AfdImportacoesTable importacoes={importacoes} />
    </div>
  );
}
