import { notFound } from "next/navigation";
import { Clock3 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarFusoHorarioAction } from "@/modules/fusos-horarios/application/actions/salvar-fuso-horario.action";
import { buscarFusoHorarioPorId } from "@/modules/fusos-horarios/infrastructure/repositories/fuso-horario.repository";
import { FusoHorarioForm } from "@/modules/fusos-horarios/presentation/components/fuso-horario-form";

type EditarFusoHorarioPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditarFusoHorarioPage({
  params,
}: EditarFusoHorarioPageProps) {
  await exigirPermissaoOuRedirecionar("fusos-horarios:gerenciar:global");

  const { id } = await params;
  const fuso = await buscarFusoHorarioPorId(id);

  if (!fuso) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administracao", href: "/administracao" },
          { label: "Fusos horarios", href: "/administracao/fusos-horarios" },
          { label: "Editar" },
        ]}
      />

      <PageHeader
        icon={Clock3}
        titulo="Editar fuso horario"
        descricao="Atualize o rotulo, descricao e disponibilidade do fuso."
      />

      <FusoHorarioForm
        action={atualizarFusoHorarioAction.bind(null, fuso.id)}
        modo="editar"
        valoresIniciais={{
          valor: fuso.valor,
          rotulo: fuso.rotulo,
          descricao: fuso.descricao,
          ativo: fuso.ativo,
        }}
      />
    </div>
  );
}
