import { notFound } from "next/navigation";
import { CalendarRange } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { resolverEscopoServidoresRecesso } from "@/modules/recesso-forense/application/services/escopo-recesso-forense.service";
import { buscarRecessoForensePorId } from "@/modules/recesso-forense/infrastructure/repositories/recesso-forense.repository";
import { HomologacaoRecessoPanel } from "@/modules/recesso-forense/presentation/components/homologacao-recesso-panel";

type RecessoHomologacaoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecessoHomologacaoPage({
  params,
}: RecessoHomologacaoPageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:homologar:chefia",
    "recesso:aceitar:secad",
    "recesso:gerenciar:global",
  ]);

  const { id } = await params;
  const escopoRecesso = await resolverEscopoServidoresRecesso(permissao);
  const recesso = await buscarRecessoForensePorId(id, {
    servidorIdsPermitidos: escopoRecesso.servidorIdsPermitidos,
  });

  if (!recesso) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Recesso forense", href: "/recesso-forense" },
          { label: String(recesso.ano), href: `/recesso-forense/${recesso.id}` },
          { label: "Homologação" },
        ]}
      />

      <PageHeader
        icon={CalendarRange}
        titulo={`Homologacao do recesso ${recesso.ano}`}
        descricao="Acompanhe os fechamentos separados de dezembro e janeiro."
        artigo="Fluxo institucional"
        regraTitulo="Homologação separada"
        regraDescricao="A homologação do recesso deve respeitar os fechamentos de dezembro e janeiro antes do aceite SECAD e encaminhamentos posteriores."
      />

      <HomologacaoRecessoPanel
        homologacoes={recesso.homologacoes}
        podeHomologar={permissao.permissoes.includes("recesso:homologar:chefia")}
        podeAceitarSecad={
          permissao.permissoes.includes("recesso:aceitar:secad") ||
          permissao.permissoes.includes("recesso:gerenciar:global")
        }
      />
    </div>
  );
}
