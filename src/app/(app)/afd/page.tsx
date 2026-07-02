import { Upload } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { AfdUploadDropzone } from "@/modules/afd/presentation/components/afd-upload-dropzone";
import { AfdImportacoesTable } from "@/modules/afd/presentation/components/afd-importacoes-table";
import { ReprocessarMarcacoesBrutasForm } from "@/modules/marcacoes-brutas/presentation/components/reprocessar-marcacoes-brutas-form";
import { listarImportacoesAfd } from "@/modules/afd/infrastructure/repositories/afd.repository";
import { listarEquipamentosParaIdentificacaoAfd } from "@/modules/integracoes/infrastructure/repositories/integracoes.repository";

export default async function AfdPage() {
  await exigirPermissaoOuRedirecionar("afd:importar:global");

  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const [importacoes, equipamentos] = await Promise.all([
    listarImportacoesAfd(),
    listarEquipamentosParaIdentificacaoAfd({
      orgaoIdsPermitidos: escopoOrgao.global ? undefined : escopoOrgao.orgaoIds,
    }),
  ]);
  const equipamentosOptions = equipamentos.map((equipamento) => ({
    value: equipamento.codigo,
    label: `${equipamento.codigo} - ${equipamento.nome}`,
    searchText: `${equipamento.numeroSerie ?? ""} ${
      equipamento.unidade?.sigla ?? ""
    } ${equipamento.unidade?.nome ?? ""}`,
  }));

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Importação AFD" }]} />

      <PageHeader
        icon={Upload}
        titulo="Upload de arquivos AFD"
        descricao="Envie arquivos AFD dos equipamentos biométricos para sincronizar marcações brutas oficiais, evitando duplicidades e enfileirando o processamento assincrono."
        artigo="Registro biométrico"
        regraTitulo="Fonte oficial das marcações"
        regraDescricao="Os arquivos AFD são importados como marcações brutas imutaveis e posteriormente processados para apuração de frequência."
      />

      <AfdUploadDropzone equipamentos={equipamentosOptions} />

      <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Reprocessar pendências</h2>

        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          Use esta ação após cadastrar servidores que possuiam marcações brutas
          pendentes por CPF ou matrícula. Primeiro o sistema associa todas as
          marcações possíveis aos servidores e somente depois inicia o
          reprocessamento.
        </p>

        <ReprocessarMarcacoesBrutasForm />
      </section>

      <AfdImportacoesTable importacoes={importacoes} />
    </div>
  );
}
