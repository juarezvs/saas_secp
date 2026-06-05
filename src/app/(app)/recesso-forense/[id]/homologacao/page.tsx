import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarRecessoForensePorId } from "@/modules/recesso-forense/infrastructure/repositories/recesso-forense.repository";
import { HomologacaoRecessoPanel } from "@/modules/recesso-forense/presentation/components/homologacao-recesso-panel";

type RecessoHomologacaoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecessoHomologacaoPage({
  params,
}: RecessoHomologacaoPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:homologar:chefia",
    "recesso:aceitar:secad",
    "recesso:gerenciar:global",
  ]);

  const { id } = await params;
  const recesso = await buscarRecessoForensePorId(id);

  if (!recesso) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Recesso forense", href: "/recesso-forense" },
          { label: String(recesso.ano), href: `/recesso-forense/${recesso.id}` },
          { label: "Homologacao" },
        ]}
      />

      <section>
        <h1 className="text-3xl font-bold tracking-tight">
          Homologacao do recesso {recesso.ano}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Acompanhe os fechamentos separados de dezembro e janeiro.
        </p>
      </section>

      <HomologacaoRecessoPanel homologacoes={recesso.homologacoes} />
    </div>
  );
}
