import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarConvocacaoRecessoAction } from "@/modules/recesso-forense/application/actions/recesso-forense.actions";
import {
  buscarRecessoForensePorId,
  listarServidoresParaRecesso,
  listarUnidadesParaRecesso,
} from "@/modules/recesso-forense/infrastructure/repositories/recesso-forense.repository";
import { ConvocacaoRecessoForm } from "@/modules/recesso-forense/presentation/components/convocacao-recesso-form";
import { ConvocacoesRecessoPanel } from "@/modules/recesso-forense/presentation/components/convocacoes-recesso-panel";

type RecessoConvocacoesPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    convocacao?: string;
    servidor?: string;
  }>;
};

export default async function RecessoConvocacoesPage({
  params,
  searchParams,
}: RecessoConvocacoesPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:convocacao:gerenciar",
    "recesso:gerenciar:global",
  ]);

  const { id } = await params;
  const filtros = await searchParams;
  const [recesso, unidades, servidores] = await Promise.all([
    buscarRecessoForensePorId(id),
    listarUnidadesParaRecesso(),
    listarServidoresParaRecesso(),
  ]);

  if (!recesso) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Recesso forense", href: "/recesso-forense" },
          { label: String(recesso.ano), href: `/recesso-forense/${recesso.id}` },
          { label: "Convocacoes" },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Convocacoes do recesso {recesso.ano}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Cadastre portarias, servidores convocados por dia e chefia especifica
            do recesso.
          </p>
        </div>

        <Link
          href={`/recesso-forense/${recesso.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar ao recesso
        </Link>
      </section>

      <ConvocacaoRecessoForm
        recessoId={recesso.id}
        action={criarConvocacaoRecessoAction}
        unidades={unidades}
        servidores={servidores}
      />

      <ConvocacoesRecessoPanel
        recesso={recesso}
        servidores={servidores}
        edicao={{
          convocacaoId: filtros.convocacao,
          servidorId: filtros.servidor,
        }}
      />
    </div>
  );
}
