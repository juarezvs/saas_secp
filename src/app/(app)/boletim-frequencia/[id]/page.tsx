import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarBoletimFrequenciaPorId } from "@/modules/boletim-frequencia/infrastructure/repositories/boletim-frequencia.repository";
import { BoletimFrequenciaCard } from "@/modules/boletim-frequencia/presentation/components/boletim-frequencia-card";
import { BoletimServidoresTable } from "@/modules/boletim-frequencia/presentation/components/boletim-servidores-table";
import { BoletimAcoesCard } from "@/modules/boletim-frequencia/presentation/components/boletim-acoes-card";

type BoletimDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BoletimDetalhePage({
  params,
}: BoletimDetalhePageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "boletim-frequencia:gerar:chefia",
    "boletim-frequencia:consultar:global",
  ]);

  const { id } = await params;
  const boletim = await buscarBoletimFrequenciaPorId(id);

  if (!boletim) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Boletim de Frequência", href: "/boletim-frequencia" },
          {
            label: `${boletim.unidade.sigla} ${String(
              boletim.mesReferencia,
            ).padStart(2, "0")}/${boletim.anoReferencia}`,
          },
        ]}
      />

      <BoletimFrequenciaCard boletim={boletim} />

      <a
        href={`/api/relatorios/boletim/${boletim.id}/pdf`}
        className="inline-flex items-center justify-center rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
      >
        Exportar Boletim em PDF
      </a>
      <RegraPortariaCard
        artigo="Arts. 16, 17 e 20"
        titulo="Encaminhamento e conferência"
        descricao="O boletim consolidado deverá ser encaminhado à SECAP/NUCGP para conferência com os registros de pessoal e providências administrativas cabíveis."
      />

      <BoletimAcoesCard boletimId={boletim.id} status={boletim.status} />

      <BoletimServidoresTable servidores={boletim.servidores} />
    </div>
  );
}
