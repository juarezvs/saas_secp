import { CalendarX } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/auth";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarServidorPorUsuarioId } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { listarAfastamentosServidorSarh } from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { AfastamentosServidorCard } from "@/modules/servidores/presentation/components/afastamentos-servidor-card";

const PERMISSOES_MEUS_AFASTAMENTOS = ["afastamentos:consultar:proprio"];

export default async function MeusAfastamentosPage() {
  await exigirUmaDasPermissoesOuRedirecionar(PERMISSOES_MEUS_AFASTAMENTOS);

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const servidor = await buscarServidorPorUsuarioId(
    session.user.id,
    session.user.matricula,
  );

  if (!servidor) {
    redirect("/acesso-negado?motivo=servidor-nao-localizado");
  }

  const afastamentos = await listarAfastamentosServidorSarh(servidor.id);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Início", href: "/dashboard" },
          { label: "Meus afastamentos" },
        ]}
      />

      <PageHeader
        icon={CalendarX}
        titulo="Meus afastamentos"
        descricao="Consulte licenças, férias e demais afastamentos importados do SARH que impactam o seu espelho de ponto."
      />

      <AfastamentosServidorCard
        afastamentos={afastamentos}
        titulo="Afastamentos registrados"
        descricao="Registros vinculados à sua matrícula funcional no SARH."
      />
    </div>
  );
}
