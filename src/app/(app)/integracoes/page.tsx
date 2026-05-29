import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Fingerprint,
  FileText,
  KeyRound,
  Network,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { prisma } from "@/shared/infrastructure/database/prisma";

type StatusVisual = "disponivel" | "planejado" | "atencao" | "inativo";

function formatarData(data: Date | string | null | undefined) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function obterBadgeStatus(status: StatusVisual) {
  const classes: Record<StatusVisual, string> = {
    disponivel:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300",
    planejado:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
    atencao:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    inativo:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  };

  const labels: Record<StatusVisual, string> = {
    disponivel: "Disponível",
    planejado: "Planejado",
    atencao: "Atenção",
    inativo: "Inativo",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

function StatusResumoCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
}: {
  titulo: string;
  valor: string | number;
  descricao: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{titulo}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{valor}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{descricao}</p>
    </div>
  );
}

function IntegracaoCard({
  titulo,
  descricao,
  href,
  status,
  icon: Icon,
  detalhes,
}: {
  titulo: string;
  descricao: string;
  href?: string;
  status: StatusVisual;
  icon: typeof Activity;
  detalhes: string[];
}) {
  const conteudo = (
    <div className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-xl bg-blue-50 p-3 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        {obterBadgeStatus(status)}
      </div>

      <div className="mt-4 flex-1">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{titulo}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{descricao}</p>

        <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          {detalhes.map((detalhe) => (
            <li key={detalhe} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />
              <span>{detalhe}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm dark:border-slate-900">
        <span className={href ? "font-medium text-blue-700 dark:text-blue-300" : "text-slate-400"}>
          {href ? "Acessar integração" : "Aguardando implementação"}
        </span>
        {href ? (
          <ArrowRight className="h-4 w-4 text-blue-700 transition group-hover:translate-x-0.5 dark:text-blue-300" aria-hidden="true" />
        ) : (
          <Clock3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
        )}
      </div>
    </div>
  );

  if (!href) return conteudo;

  return (
    <Link href={href} className="block h-full" aria-label={`Acessar ${titulo}`}>
      {conteudo}
    </Link>
  );
}

export default async function IntegracoesPage() {
  const [integracoes, ultimaExecucaoSarh, conflitosPendentesSarh, itensComErroSarh] = await Promise.all([
    prisma.integracaoSistema.findMany({
      orderBy: [{ tipo: "asc" }, { nome: "asc" }],
    }),
    prisma.integracaoSarhExecucao.findFirst({
      orderBy: { iniciadoEm: "desc" },
    }),
    prisma.integracaoSarhConflito.count({
      where: { status: "PENDENTE" },
    }),
    prisma.integracaoSarhItem.count({
      where: { status: "ERRO" },
    }),
  ]);

  const sarh = integracoes.find((integracao) => integracao.tipo === "SARH");
  const integracoesAtivas = integracoes.filter((integracao) => integracao.ativo).length;
  const integracoesComErro = integracoes.filter((integracao) => integracao.status === "ERRO").length;

  const statusSarh: StatusVisual = !sarh
    ? "atencao"
    : sarh.status === "ATIVA"
      ? "disponivel"
      : sarh.status === "ERRO"
        ? "atencao"
        : "inativo";

  return (
    <main className="space-y-6 p-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Administração</p>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              Integrações do SECP
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Painel central para integrações institucionais do SECP. Use esta área para acompanhar fontes externas,
              sincronizações, disponibilidade, conflitos, erros operacionais e evolução dos conectores do sistema.
            </p>
          </div>

          <Link
            href="/administracao/integracoes/sarh"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Sincronizar SARH
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Finalidade administrativa</h2>
            <p className="mt-1">
              Esta página concentra integrações que apoiam o controle eletrônico de frequência, a conferência de dados
              cadastrais, a rastreabilidade das sincronizações e a governança operacional do SECP.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusResumoCard
          titulo="Integrações cadastradas"
          valor={integracoes.length}
          descricao="Total de integrações registradas em Administração."
          icon={Network}
        />
        <StatusResumoCard
          titulo="Integrações ativas"
          valor={integracoesAtivas}
          descricao="Conectores habilitados para uso operacional."
          icon={Activity}
        />
        <StatusResumoCard
          titulo="Conflitos SARH"
          valor={conflitosPendentesSarh}
          descricao="Pendências que exigem decisão administrativa."
          icon={AlertTriangle}
        />
        <StatusResumoCard
          titulo="Itens SARH com erro"
          valor={itensComErroSarh}
          descricao="Registros que precisam de análise ou reprocessamento."
          icon={DatabaseZap}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-4">
        <IntegracaoCard
          titulo="SARH"
          descricao="Integração com o Sistema de Gestão de Recursos Humanos para carga e sincronização de órgãos, lotações, cargos, servidores e vínculos servidor-lotação."
          href="/administracao/integracoes/sarh"
          status={statusSarh}
          icon={UsersRound}
          detalhes={[
            `Status: ${sarh?.status ?? "não configurada"}`,
            `Última execução: ${formatarData(ultimaExecucaoSarh?.iniciadoEm)}`,
            `Base URL: ${sarh?.baseUrl ?? "SARH_BASE_URL pendente"}`,
          ]}
        />

        <IntegracaoCard
          titulo="SEI"
          descricao="Conector previsto para consulta, referência e futura automação de documentos, boletins de frequência e processos administrativos relacionados ao ponto."
          status="planejado"
          icon={FileText}
          detalhes={[
            "Futura vinculação de boletins de frequência",
            "Consulta de processos administrativos",
            "Registro de referências documentais",
          ]}
        />

        <IntegracaoCard
          titulo="Equipamentos biométricos"
          descricao="Integração com relógios, totens e dispositivos de identificação biométrica para ingestão de marcações e eventos operacionais."
          status="planejado"
          icon={Fingerprint}
          detalhes={[
            "Recebimento de marcações",
            "Heartbeat e monitoramento dos equipamentos",
            "Tratamento de falhas de comunicação",
          ]}
        />

        <IntegracaoCard
          titulo="LDAP / Active Directory"
          descricao="Integração com a rede Windows institucional para autenticação, identificação por matrícula e eventual leitura de grupos administrativos."
          status="planejado"
          icon={KeyRound}
          detalhes={[
            "Login com matrícula e senha de rede",
            "Mapeamento de grupos para perfis",
            "Suporte futuro a múltiplos provedores",
          ]}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Integrações registradas</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Visão técnica dos conectores cadastrados na tabela de integrações do SECP.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Direção</th>
                <th className="py-2 pr-3">Ativa</th>
                <th className="py-2 pr-3">Último sucesso</th>
                <th className="py-2 pr-3">Último erro</th>
              </tr>
            </thead>
            <tbody>
              {integracoes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma integração cadastrada. Execute o seed da Fase 1 para registrar a integração SARH.
                  </td>
                </tr>
              ) : (
                integracoes.map((integracao) => (
                  <tr key={integracao.id} className="border-b border-slate-100 dark:border-slate-900">
                    <td className="py-3 pr-3 font-medium text-slate-900 dark:text-slate-100">{integracao.nome}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">{integracao.tipo}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">{integracao.status}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">{integracao.direcao}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">{integracao.ativo ? "Sim" : "Não"}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">
                      {formatarData(integracao.ultimoSucessoEm)}
                    </td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">
                      {integracao.ultimoErro ? (
                        <span className="line-clamp-1 max-w-[260px]" title={integracao.ultimoErro}>
                          {integracao.ultimoErro}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {integracoesComErro > 0 ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            Existem {integracoesComErro} integração(ões) com status de erro. Verifique os logs antes de executar novas sincronizações.
          </div>
        ) : null}
      </section>
    </main>
  );
}
