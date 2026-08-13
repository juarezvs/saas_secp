import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { atualizarSarhOracleAction } from "@/modules/integracoes/sarh/presentation/actions/atualizar-sarh-oracle.action";
import { obterConfiguracaoSarhOracle } from "@/modules/integracoes/sarh/application/services/sarh-oracle-config.service";
import { SarhOracleForm } from "@/modules/integracoes/sarh/presentation/components/sarh-oracle-form";
import { SarhStatusCard } from "@/modules/integracoes/sarh/presentation/components/sarh-status-card";
import { SarhSyncProgressForm } from "@/modules/integracoes/sarh/presentation/components/sarh-sync-progress-form";

function formatarData(data: Date | string | null | undefined) {
  if (!data) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

const ID_UUID_SEM_RESULTADO = "00000000-0000-4000-8000-000000000000";

type IntegracaoSarhPageProps = {
  searchParams?: Promise<{
    orgaoId?: string;
  }>;
};

export default async function IntegracaoSarhPage({
  searchParams,
}: IntegracaoSarhPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "integracoes:consultar:seccional",
    "integracoes:gerenciar:seccional",
    "integracoes:consultar:global",
    "integracoes:gerenciar:global",
    "integracoes-sarh:consultar:global",
    "integracoes-sarh:executar:global",
    "integracoes-sarh:configurar:global",
  ]);

  const params = searchParams ? await searchParams : {};
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaos = escopoOrgao.global
    ? await prisma.orgao.findMany({
        where: { ativo: true },
        select: { id: true, sigla: true, nome: true },
        orderBy: [{ sigla: "asc" }, { nome: "asc" }],
      })
    : escopoOrgao.orgaos;
  const permiteEscolherOrgao = escopoOrgao.global;
  const orgaoSelecionado =
    orgaos.find((orgao) => orgao.id === params.orgaoId)?.id ??
    (escopoOrgao.global ? null : (orgaos[0]?.id ?? null));
  const configuracaoSarh = await obterConfiguracaoSarhOracle(orgaoSelecionado);
  const integracoesHref = orgaoSelecionado
    ? `/administracao/integracoes?${new URLSearchParams({
        orgaoId: orgaoSelecionado,
      }).toString()}`
    : "/administracao/integracoes";
  const integracao = await prisma.integracaoSistema.findFirst({
    where: { tipo: "SARH", orgaoId: orgaoSelecionado ?? null },
    orderBy: { atualizadoEm: "desc" },
  });

  const execucoes = await prisma.integracaoSarhExecucao.findMany({
    where: {
      integracaoId: integracao?.id ?? ID_UUID_SEM_RESULTADO,
    },
    orderBy: { iniciadoEm: "desc" },
    take: 10,
  });

  const ultimaExecucao = execucoes[0];
  const [
    conflitosPendentes,
    itensComErro,
    tiposAfastamento,
    afastamentos,
    afastamentosAtivos,
    afastamentosSemServidor,
  ] = await Promise.all([
    prisma.integracaoSarhConflito.count({
      where: {
        status: "PENDENTE",
        execucao: { integracaoId: integracao?.id ?? ID_UUID_SEM_RESULTADO },
      },
    }),
    prisma.integracaoSarhItem.count({
      where: {
        status: "ERRO",
        execucao: { integracaoId: integracao?.id ?? ID_UUID_SEM_RESULTADO },
      },
    }),
    prisma.tipoAfastamentoSarh.count(),
    prisma.afastamentoSarh.count(),
    prisma.afastamentoSarh.count({ where: { ativo: true } }),
    prisma.afastamentoSarh.count({ where: { servidorId: null } }),
  ]);

  return (
    <main className="space-y-6 p-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Integrações por seccional", href: integracoesHref },
          { label: "Conexão Oracle SARH" },
        ]}
      />

      <div className="flex flex-col gap-2">
        <p className="sr-only">Administração / Integrações</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
          Integração com SARH
        </h1>
        <p className="max-w-4xl text-sm text-slate-600 dark:text-slate-300">
          Carga e sincronização de dados cadastrais oficiais: órgãos, lotações,
          cargos, servidores, vínculo servidor-lotação, tipos de afastamento e
          afastamentos. O SECP preserva como dados próprios as regras de ponto,
          jornada, escala, marcações, banco de horas, homologações, perfis,
          permissões e biometria.
        </p>
      </div>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
        <h2 className="font-semibold">Base normativa atendida</h2>
        <p className="mt-1">
          A Portaria SJAM-DIREF 135/2025 atribui ao NUTEC a gestão do sistema de
          controle eletrônico de frequência e à SECAP/NUCGP a conferência dos
          boletins com os dados lançados no SARH. Por isso, esta tela registra
          execuções, payloads, itens processados, erros e conflitos de
          sincronização.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <SarhStatusCard
          titulo="Status"
          valor={integracao?.status ?? "NÃO CONFIGURADA"}
          descricao={
            orgaoSelecionado
              ? `Seccional: ${
                  orgaos.find((orgao) => orgao.id === orgaoSelecionado)
                    ?.sigla ?? "-"
                }`
              : "Configuração global"
          }
        />
        <SarhStatusCard
          titulo="Última execução"
          valor={ultimaExecucao ? formatarData(ultimaExecucao.iniciadoEm) : "-"}
          descricao={ultimaExecucao?.status ?? "Nenhuma execução registrada"}
        />
        <SarhStatusCard
          titulo="Conflitos pendentes"
          valor={conflitosPendentes}
          descricao="Exigem decisão do NUTEC/Administrador"
        />
        <SarhStatusCard
          titulo="Itens com erro"
          valor={itensComErro}
          descricao="Registros não processados corretamente"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <SarhStatusCard
          titulo="Tipos de afastamento"
          valor={tiposAfastamento}
          descricao="Tabela oficial de tipos do SARH"
        />
        <SarhStatusCard
          titulo="Afastamentos"
          valor={afastamentos}
          descricao="Licenças, férias e demais afastamentos importados"
        />
        <SarhStatusCard
          titulo="Afastamentos ativos"
          valor={afastamentosAtivos}
          descricao="Com vigência aberta ou fim futuro"
        />
        <SarhStatusCard
          titulo="Sem servidor vinculado"
          valor={afastamentosSemServidor}
          descricao="Matrícula/CPF ainda não encontrado no SECP"
        />
      </section>

      {permiteEscolherOrgao && (
        <form className="rounded-xl border bg-card p-4 shadow-sm">
          <label htmlFor="orgaoFiltro" className="text-sm font-semibold">
            Editar/executar integração de
          </label>
          <div className="mt-2 flex flex-col gap-3 md:flex-row">
            <select
              id="orgaoFiltro"
              name="orgaoId"
              defaultValue={orgaoSelecionado ?? ""}
              className="h-11 flex-1 rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            >
              <option value="">Padrão do sistema</option>
              {orgaos.map((orgao) => (
                <option key={orgao.id} value={orgao.id}>
                  {orgao.sigla} - {orgao.nome}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-md bg-blue-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-950"
            >
              Carregar
            </button>
          </div>
        </form>
      )}

      <SarhOracleForm
        action={atualizarSarhOracleAction}
        valoresIniciais={{
          orgaoId: configuracaoSarh.orgaoId ?? "",
          nome: configuracaoSarh.nome,
          ativo: configuracaoSarh.ativo,
          username: configuracaoSarh.username ?? "",
          password: configuracaoSarh.password ?? "",
          connectString: configuracaoSarh.connectString ?? "",
          oracleHome: configuracaoSarh.oracleHome ?? "",
          siglaLocalidade: configuracaoSarh.siglaLocalidade ?? "AM",
          possuiPassword: configuracaoSarh.possuiPassword,
        }}
        orgaos={orgaos}
        permiteEscolherOrgao={permiteEscolherOrgao}
      />

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <SarhSyncProgressForm orgaoId={orgaoSelecionado} />

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                Últimas execuções
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Histórico operacional da integração SARH.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-3">Início</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Simulação</th>
                  <th className="py-2 pr-3">Recebidos</th>
                  <th className="py-2 pr-3">Criados</th>
                  <th className="py-2 pr-3">Atualizados</th>
                  <th className="py-2 pr-3">Erros</th>
                </tr>
              </thead>
              <tbody>
                {execucoes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">
                      Nenhuma execução registrada.
                    </td>
                  </tr>
                ) : (
                  execucoes.map((execucao) => (
                    <tr
                      key={execucao.id}
                      className="border-b border-slate-100 dark:border-slate-900"
                    >
                      <td className="py-2 pr-3">
                        {formatarData(execucao.iniciadoEm)}
                      </td>
                      <td className="py-2 pr-3">{execucao.tipo}</td>
                      <td className="py-2 pr-3">{execucao.status}</td>
                      <td className="py-2 pr-3">
                        {execucao.modoSimulacao ? "Sim" : "Não"}
                      </td>
                      <td className="py-2 pr-3">{execucao.totalRecebidos}</td>
                      <td className="py-2 pr-3">{execucao.totalCriados}</td>
                      <td className="py-2 pr-3">{execucao.totalAtualizados}</td>
                      <td className="py-2 pr-3">
                        <span className="inline-flex items-center gap-2">
                          {execucao.totalErros +
                            (execucao.mensagemErro && execucao.totalErros === 0
                              ? 1
                              : 0)}
                          {(execucao.totalErros > 0 ||
                            Boolean(execucao.mensagemErro)) && (
                            <Link
                              href={`/administracao/integracoes/sarh/execucoes/${execucao.id}/erros`}
                              className="inline-flex rounded text-red-600 transition hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:text-red-400 dark:hover:text-red-300"
                              aria-label="Ver resumo dos erros desta execução"
                              title="Ver resumo dos erros"
                            >
                              <CircleAlert
                                className="size-4"
                                aria-hidden="true"
                              />
                            </Link>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
