import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarEntidadesAuditoria,
  listarEventosAuditoria,
  listarUsuariosParaFiltroAuditoria,
} from "@/modules/auditoria/infrastructure/repositories/auditoria.repository";
import { AuditoriaFiltrosCard } from "@/modules/auditoria/presentation/components/auditoria-filtros-card";
import { AuditoriaTable } from "@/modules/auditoria/presentation/components/auditoria-table";

type AuditoriaPageProps = {
  searchParams?: Promise<{
    pagina?: string;
    limite?: string;
    busca?: string;
    entidade?: string;
    acao?: string;
    usuarioId?: string;
    dataInicio?: string;
    dataFim?: string;
  }>;
};

export default async function AuditoriaPage({
  searchParams,
}: AuditoriaPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "auditoria:consultar:global",
    "auditoria:detalhar:global",
  ]);

  const params = searchParams ? await searchParams : {};

  const pagina = Number(params.pagina ?? 1);
  const limite = Number(params.limite ?? 20);

  const [resultado, usuarios, entidades] = await Promise.all([
    listarEventosAuditoria({
      pagina,
      limite,
      busca: params.busca,
      entidade: params.entidade,
      acao: params.acao,
      usuarioId: params.usuarioId,
      dataInicio: params.dataInicio,
      dataFim: params.dataFim,
    }),
    listarUsuariosParaFiltroAuditoria(),
    listarEntidadesAuditoria(),
  ]);

  const queryStringBase = new URLSearchParams(
    Object.entries(params).filter(([, value]) => Boolean(value)) as [
      string,
      string,
    ][],
  ).toString();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Auditoria" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Auditoria e trilhas de controle
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Eventos de auditoria
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Consulte ações sensíveis realizadas no SECP, incluindo marcações,
          solicitações, apurações, banco de horas, homologações, boletins,
          usuários e perfis.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Governança, controle eletrônico e responsabilidade"
        titulo="Rastreabilidade das ações"
        descricao="A auditoria registra quem realizou cada ação, quando ocorreu, qual entidade foi afetada e quais dados foram alterados, apoiando a responsabilização administrativa e a integridade do controle de frequência."
      />

      <AuditoriaFiltrosCard
        usuarios={usuarios}
        entidades={entidades}
        valores={{
          busca: params.busca,
          entidade: params.entidade,
          acao: params.acao,
          usuarioId: params.usuarioId,
          dataInicio: params.dataInicio,
          dataFim: params.dataFim,
          limite: params.limite,
        }}
      />

      <AuditoriaTable
        eventos={resultado.eventos}
        paginacao={resultado.paginacao}
        queryStringBase={queryStringBase}
      />
    </div>
  );
}
