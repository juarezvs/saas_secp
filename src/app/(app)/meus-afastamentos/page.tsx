import { CalendarX } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarServidorPorUsuarioId } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { listarAfastamentosServidorSarhPaginado } from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { AfastamentosServidorCard } from "@/modules/servidores/presentation/components/afastamentos-servidor-card";

const PERMISSOES_MEUS_AFASTAMENTOS = ["afastamentos:consultar:proprio"];

type AbaAfastamentos = "ferias" | "outros";

type MeusAfastamentosPageProps = {
  searchParams?: Promise<{
    aba?: string;
    paginaFerias?: string;
    paginaOutros?: string;
  }>;
};

function montarHrefAba(aba: AbaAfastamentos) {
  const params = new URLSearchParams();
  params.set("aba", aba);
  return `/meus-afastamentos?${params.toString()}`;
}

function classeAba(ativa: boolean) {
  return [
    "inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition",
    ativa
      ? "border-blue-900 bg-blue-900 text-white"
      : "border-border bg-card hover:bg-muted",
  ].join(" ");
}

export default async function MeusAfastamentosPage({
  searchParams,
}: MeusAfastamentosPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar(PERMISSOES_MEUS_AFASTAMENTOS);

  const session = await auth();
  const query = searchParams ? await searchParams : {};
  const abaAtiva: AbaAfastamentos = query.aba === "outros" ? "outros" : "ferias";
  const paginaFerias = Number(query.paginaFerias ?? 1);
  const paginaOutros = Number(query.paginaOutros ?? 1);

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

  const [feriasResultado, outrosAfastamentosResultado] = await Promise.all([
    listarAfastamentosServidorSarhPaginado(servidor.id, {
      pagina: paginaFerias,
      grupo: "ferias",
    }),
    listarAfastamentosServidorSarhPaginado(servidor.id, {
      pagina: paginaOutros,
      grupo: "outros",
    }),
  ]);

  function montarHrefPaginaFerias(novaPagina: number) {
    const params = new URLSearchParams();
    params.set("aba", "ferias");
    params.set("paginaFerias", String(novaPagina));
    return `/meus-afastamentos?${params.toString()}`;
  }

  function montarHrefPaginaOutros(novaPagina: number) {
    const params = new URLSearchParams();
    params.set("aba", "outros");
    params.set("paginaOutros", String(novaPagina));
    return `/meus-afastamentos?${params.toString()}`;
  }

  const resultadoAtivo =
    abaAtiva === "ferias" ? feriasResultado : outrosAfastamentosResultado;
  const tituloAtivo =
    abaAtiva === "ferias" ? "Férias registradas" : "Outros afastamentos";
  const descricaoAtiva =
    abaAtiva === "ferias"
      ? "Períodos de férias importados do SARH e vinculados à sua matrícula funcional."
      : "Licenças, afastamentos diversos e demais registros importados do SARH.";

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

      <nav
        aria-label="Tipos de afastamento"
        className="flex flex-wrap gap-2 rounded-xl border bg-card p-2"
      >
        <a href={montarHrefAba("ferias")} className={classeAba(abaAtiva === "ferias")}>
          Férias
          <span className="ml-2 rounded-full bg-background/80 px-2 py-0.5 text-xs text-foreground">
            {feriasResultado.total}
          </span>
        </a>
        <a href={montarHrefAba("outros")} className={classeAba(abaAtiva === "outros")}>
          Outros afastamentos
          <span className="ml-2 rounded-full bg-background/80 px-2 py-0.5 text-xs text-foreground">
            {outrosAfastamentosResultado.total}
          </span>
        </a>
      </nav>

      <AfastamentosServidorCard
        afastamentos={resultadoAtivo.afastamentos}
        titulo={tituloAtivo}
        resumo={{
          total: resultadoAtivo.total,
          vigentes: resultadoAtivo.vigentes,
          futuros: resultadoAtivo.futuros,
        }}
        paginacao={{
          total: resultadoAtivo.total,
          pagina: resultadoAtivo.pagina,
          totalPaginas: resultadoAtivo.totalPaginas,
          itensPorPagina: resultadoAtivo.itensPorPagina,
          montarHrefPagina:
            abaAtiva === "ferias"
              ? montarHrefPaginaFerias
              : montarHrefPaginaOutros,
        }}
        descricao={descricaoAtiva}
      />
    </div>
  );
}
