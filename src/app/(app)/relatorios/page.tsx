import { BarChart3 } from "lucide-react";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  buscarServidorRelatorioPorUsuarioId,
  listarBoletinsParaRelatorio,
  listarServidoresParaRelatorio,
} from "@/modules/relatorios/infrastructure/repositories/relatorios.repository";
import { FiltrosRelatoriosCard } from "@/modules/relatorios/presentation/components/filtros-relatorios-card";
import { RelatoriosListCard } from "@/modules/relatorios/presentation/components/relatorios-list-card";

function normalizarCompetencia(params: {
  competencia?: string;
  ano?: string;
  mes?: string;
}) {
  const hoje = new Date();
  const matchCompetencia = params.competencia?.match(/^(\d{4})-(\d{2})$/);
  const anoCompetencia = matchCompetencia ? Number(matchCompetencia[1]) : null;
  const mesCompetencia = matchCompetencia ? Number(matchCompetencia[2]) : null;
  const anoParam = params.ano ? Number(params.ano) : null;
  const mesParam = params.mes ? Number(params.mes) : null;

  const ano =
    anoCompetencia && Number.isInteger(anoCompetencia)
      ? anoCompetencia
      : anoParam && Number.isInteger(anoParam)
        ? anoParam
        : hoje.getFullYear();
  const mes =
    mesCompetencia &&
    Number.isInteger(mesCompetencia) &&
    mesCompetencia >= 1 &&
    mesCompetencia <= 12
      ? mesCompetencia
      : mesParam && Number.isInteger(mesParam) && mesParam >= 1 && mesParam <= 12
        ? mesParam
        : hoje.getMonth() + 1;

  return { ano, mes };
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams?: Promise<{
    servidorId?: string;
    competencia?: string;
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
  const { ano, mes } = normalizarCompetencia(params);

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

      <PageHeader
        icon={BarChart3}
        titulo="Relatórios do SECP"
        descricao="Exporte espelho de ponto, banco de horas e boletins de frequência em PDF."
        artigo="Arts. 8, 16, 17 e 19"
        regraTitulo="Espelho, frequência mensal e boletim"
        regraDescricao="Os relatórios consolidam frequência diária, saldo de horas, apuração mensal e Boletim de Frequência, servindo de base para conferência, homologação e juntada no SEI."
      />

      <FiltrosRelatoriosCard
        servidores={servidores}
        servidorProprioId={servidorProprio?.id ?? null}
        podeConsultarGlobal={podeConsultarGlobal}
        servidorSelecionadoId={servidorId}
        competencia={`${ano}-${String(mes).padStart(2, "0")}`}
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
