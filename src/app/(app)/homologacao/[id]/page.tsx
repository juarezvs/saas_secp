import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarFechamentoPorId } from "@/modules/homologacao/infrastructure/repositories/homologacao.repository";
import { FechamentoUnidadeCard } from "@/modules/homologacao/presentation/components/fechamento-unidade-card";
import { ServidoresHomologacaoTable } from "@/modules/homologacao/presentation/components/servidores-homologacao-table";
import { gerarBoletimFrequenciaAction } from "@/modules/boletim-frequencia/application/actions/gerar-boletim-frequencia.action";

type HomologacaoDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function HomologacaoDetalhePage({
  params,
}: HomologacaoDetalhePageProps) {
  await exigirPermissaoOuRedirecionar("homologacao:gerenciar:chefia");

  const { id } = await params;
  const fechamento = await buscarFechamentoPorId(id);

  if (!fechamento) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Homologação", href: "/homologacao" },
          {
            label: `${fechamento.unidade.sigla} ${String(
              fechamento.mesReferencia,
            ).padStart(2, "0")}/${fechamento.anoReferencia}`,
          },
        ]}
      />

      <FechamentoUnidadeCard fechamento={fechamento} />

      {fechamento.status === "HOMOLOGADO" && !fechamento.boletimFrequencia && (
        <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
          <h2 className="text-lg font-bold">Boletim de Frequência</h2>

          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            O fechamento está integralmente homologado e já pode gerar o Boletim
            de Frequência mensal da unidade.
          </p>

          <form
            action={gerarBoletimFrequenciaAction}
            className="mt-4 space-y-3"
          >
            <input type="hidden" name="fechamentoId" value={fechamento.id} />

            <textarea
              name="observacao"
              rows={3}
              placeholder="Observação opcional para o boletim"
              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
            />

            <button
              type="submit"
              className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            >
              Gerar Boletim de Frequência
            </button>
          </form>
        </section>
      )}

      <RegraPortariaCard
        artigo="Homologação mensal"
        titulo="Validação pela chefia"
        descricao="Antes da homologação, a chefia deve verificar inconsistências, solicitações pendentes, movimentos de banco de horas e eventuais ressalvas."
      />

      <ServidoresHomologacaoTable
        fechamentoId={fechamento.id}
        anoReferencia={fechamento.anoReferencia}
        mesReferencia={fechamento.mesReferencia}
        servidores={fechamento.servidores}
      />
    </div>
  );
}
