import { Upload } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { AfdUploadDropzone } from "@/modules/afd/presentation/components/afd-upload-dropzone";
import { AfdImportacoesTable } from "@/modules/afd/presentation/components/afd-importacoes-table";
import { listarImportacoesAfd } from "@/modules/afd/infrastructure/repositories/afd.repository";
import { reprocessarMarcacoesBrutasPendentesAction } from "@/modules/marcacoes-brutas/application/actions/reprocessar-marcacoes-brutas-pendentes.action";

export default async function AfdPage() {
  await exigirPermissaoOuRedirecionar("afd:importar:global");

  const importacoes = await listarImportacoesAfd();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Importacao AFD" }]} />

      <PageHeader
        icon={Upload}
        titulo="Upload de arquivos AFD"
        descricao="Envie arquivos AFD dos equipamentos biometricos para sincronizar marcacoes brutas oficiais, evitando duplicidades e enfileirando o processamento assincrono."
        artigo="Registro biometrico"
        regraTitulo="Fonte oficial das marcacoes"
        regraDescricao="Os arquivos AFD sao importados como marcacoes brutas imutaveis e posteriormente processados para apuracao de frequencia."
      />

      <AfdUploadDropzone />

      <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Reprocessar pendencias</h2>

        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          Use esta acao apos cadastrar servidores que possuiam marcacoes brutas
          pendentes por CPF ou matricula. O sistema tentara vincular e processar
          novamente as marcacoes ainda nao processadas.
        </p>

        <form
          action={reprocessarMarcacoesBrutasPendentesAction}
          className="mt-4"
        >
          <button
            type="submit"
            className="rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            Reprocessar marcacoes brutas pendentes
          </button>
        </form>
      </section>

      <AfdImportacoesTable importacoes={importacoes} />
    </div>
  );
}
