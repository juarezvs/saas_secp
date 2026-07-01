import { CalendarX } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/auth";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarServidorPorUsuarioId } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { listarAfastamentosServidorSarhPaginado } from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { AfastamentosServidorCard } from "@/modules/servidores/presentation/components/afastamentos-servidor-card";

const PERMISSOES_MEUS_AFASTAMENTOS = ["afastamentos:consultar:proprio"];

type MeusAfastamentosPageProps = {
  searchParams?: Promise<{
    paginaAfastamentos?: string;
  }>;
};

export default async function MeusAfastamentosPage({
  searchParams,
}: MeusAfastamentosPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar(PERMISSOES_MEUS_AFASTAMENTOS);

  const session = await auth();
  const query = searchParams ? await searchParams : {};
  const paginaAfastamentos = Number(query.paginaAfastamentos ?? 1);

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

  const afastamentosResultado = await listarAfastamentosServidorSarhPaginado(
    servidor.id,
    {
      pagina: paginaAfastamentos,
    },
  );

  function montarHrefPaginaAfastamentos(novaPagina: number) {
    const params = new URLSearchParams();
    params.set("paginaAfastamentos", String(novaPagina));
    return `/meus-afastamentos?${params.toString()}`;
  }

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
        afastamentos={afastamentosResultado.afastamentos}
        titulo="Afastamentos registrados"
        resumo={{
          total: afastamentosResultado.total,
          vigentes: afastamentosResultado.vigentes,
          futuros: afastamentosResultado.futuros,
        }}
        paginacao={{
          total: afastamentosResultado.total,
          pagina: afastamentosResultado.pagina,
          totalPaginas: afastamentosResultado.totalPaginas,
          itensPorPagina: afastamentosResultado.itensPorPagina,
          montarHrefPagina: montarHrefPaginaAfastamentos,
        }}
        descricao="Registros vinculados à sua matrícula funcional no SARH."
      />
    </div>
  );
}
