import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  buscarServidorRelatorioPorUsuarioId,
  listarBoletinsParaRelatorio,
  listarServidoresParaRelatorio,
} from "@/modules/relatorios/infrastructure/repositories/relatorios.repository";
import { FiltrosRelatoriosCard } from "@/modules/relatorios/presentation/components/filtros-relatorios-card";
import { RelatoriosListCard } from "@/modules/relatorios/presentation/components/relatorios-list-card";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams?: Promise<{
    servidorId?: string;
    ano?: string;
    mes?: string;
  }>;
}) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "relatorios:consultar:proprio",
    "relatorios:consultar:global",
  ]);

  const session = await auth();
  const permissoes = session?.user.perfilAtivo?.permissoes ?? [];
  const podeConsultarGlobal = permissoes.includes(
    "relatorios:consultar:global",
  );

  const params = searchParams ? await searchParams : {};
  const hoje = new Date();

  const ano = Number(params.ano ?? hoje.getFullYear());
  const mes = Number(params.mes ?? hoje.getMonth() + 1);

  const servidorProprio = session?.user
    ? await buscarServidorRelatorioPorUsuarioId(session.user.id)
    : null;

  const servidores = podeConsultarGlobal
    ? await listarServidoresParaRelatorio()
    : servidorProprio
      ? [servidorProprio]
      : [];

  const servidorId =
    params.servidorId && podeConsultarGlobal
      ? params.servidorId
      : (servidorProprio?.id ?? null);

  const boletins = await listarBoletinsParaRelatorio();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Relatórios" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Relatórios e exportação
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Relatórios do SECP
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Exporte espelho de ponto, banco de horas e boletins de frequência em
          PDF.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Arts. 8º, 16, 17 e 19"
        titulo="Espelho, frequência mensal e Boletim"
        descricao="Os relatórios consolidam frequência diária, saldo de horas, apuração mensal e Boletim de Frequência, servindo de base para conferência, homologação e juntada no SEI."
      />

      <FiltrosRelatoriosCard
        servidores={servidores}
        servidorProprioId={servidorProprio?.id ?? null}
        podeConsultarGlobal={podeConsultarGlobal}
      />

      <RelatoriosListCard
        servidorId={servidorId}
        ano={ano}
        mes={mes}
        boletins={boletins}
      />
    </div>
  );
}
