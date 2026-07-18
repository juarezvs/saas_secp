import { notFound } from "next/navigation";
import { Landmark } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarFusosHorariosAtivos } from "@/modules/fusos-horarios/infrastructure/repositories/fuso-horario.repository";
import { atualizarOrgaoAction } from "@/modules/orgaos/application/actions/salvar-orgao.action";
import { buscarOrgaoPorId } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { OrgaoForm } from "@/modules/orgaos/presentation/components/orgao-form";

type EditarOrgaoPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditarOrgaoPage({ params }: EditarOrgaoPageProps) {
  await exigirPermissaoOuRedirecionar("unidades:gerenciar:global");

  const { id } = await params;
  const [orgao, fusosHorarios] = await Promise.all([
    buscarOrgaoPorId(id),
    listarFusosHorariosAtivos(),
  ]);

  if (!orgao) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Órgãos", href: "/orgaos" },
          { label: "Editar" },
        ]}
      />

      <PageHeader
        icon={Landmark}
        titulo="Editar órgão"
        descricao="Atualize os dados institucionais, localidade, status e fuso horário do órgão."
      />

      <OrgaoForm
        action={atualizarOrgaoAction.bind(null, orgao.id)}
        modo="editar"
        fusosHorarios={fusosHorarios}
        valoresIniciais={{
          sigla: orgao.sigla,
          nome: orgao.nome,
          codigoExternoSarh: orgao.codigoExternoSarh,
          fusoHorario: orgao.fusoHorario,
          uf: orgao.uf,
          municipio: orgao.municipio,
          municipioIbge: orgao.municipioIbge,
          ativo: orgao.ativo,
        }}
      />
    </div>
  );
}
