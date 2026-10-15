import { FlaskConical } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { SimuladorJornadaForm } from "@/modules/mct/presentation/components/simulador-jornada-form";

export default async function SimuladorMctPage() {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar([
    "mct-simulador:usar:seccional",
    "mct-simulador:usar:global",
  ]);
  const jornadas = await prisma.jornada.findMany({
    where: {
      ativo: true,
      ...(acesso.perfilAtivoEscopoGlobal
        ? {}
        : {
            OR: [
              { orgaoId: null },
              {
                orgaoId: {
                  in: acesso.orgaoIds?.length
                    ? acesso.orgaoIds
                    : ["00000000-0000-0000-0000-000000000000"],
                },
              },
            ],
          }),
    },
    select: {
      id: true,
      codigo: true,
      nome: true,
      escalas: { where: { ativo: true }, select: { id: true, nome: true } },
    },
    orderBy: { nome: "asc" },
  });
  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[{ label: "MCT" }, { label: "Simulador de Apuração" }]}
      />
      <PageHeader
        icon={FlaskConical}
        titulo="Simulador de Apuração"
        descricao="Teste horários de trabalho cadastrados com o motor real do MCT, sem produzir efeitos oficiais."
      />
      <SimuladorJornadaForm jornadas={jornadas} />
    </div>
  );
}
