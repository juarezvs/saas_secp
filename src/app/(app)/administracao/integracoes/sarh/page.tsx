import { prisma } from "@/shared/infrastructure/database/prisma";
import { SarhStatusCard } from "@/modules/integracoes/sarh/presentation/components/sarh-status-card";
import { SarhSyncProgressForm } from "@/modules/integracoes/sarh/presentation/components/sarh-sync-progress-form";

function formatarData(data: Date | string | null | undefined) {
  if (!data) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

export default async function IntegracaoSarhPage() {
  const integracao = await prisma.integracaoSistema.findFirst({
    where: { tipo: "SARH" },
    orderBy: { criadoEm: "desc" },
  });

  const execucoes = await prisma.integracaoSarhExecucao.findMany({
    orderBy: { iniciadoEm: "desc" },
    take: 10,
  });

  const ultimaExecucao = execucoes[0];
  const conflitosPendentes = await prisma.integracaoSarhConflito.count({ where: { status: "PENDENTE" } });
  const itensComErro = await prisma.integracaoSarhItem.count({ where: { status: "ERRO" } });

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Administração / Integrações</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
          Integração com SARH
        </h1>
        <p className="max-w-4xl text-sm text-slate-600 dark:text-slate-300">
          Carga e sincronização de dados cadastrais oficiais: órgãos, lotações, cargos, servidores e vínculo
          servidor-lotação. O SECP preserva como dados próprios as regras de ponto, jornada, escala, marcações,
          banco de horas, homologações, perfis, permissões e biometria.
        </p>
      </div>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
        <h2 className="font-semibold">Base normativa atendida</h2>
        <p className="mt-1">
          A Portaria SJAM-DIREF 135/2025 atribui ao NUTEC a gestão do sistema de controle eletrônico de
          frequência e à SECAP/NUCGP a conferência dos boletins com os dados lançados no SARH. Por isso, esta
          tela registra execuções, payloads, itens processados, erros e conflitos de sincronização.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <SarhStatusCard titulo="Status" valor={integracao?.status ?? "NÃO CONFIGURADA"} descricao={integracao?.baseUrl ?? "SARH_BASE_URL não configurada"} />
        <SarhStatusCard titulo="Última execução" valor={ultimaExecucao ? formatarData(ultimaExecucao.iniciadoEm) : "-"} descricao={ultimaExecucao?.status ?? "Nenhuma execução registrada"} />
        <SarhStatusCard titulo="Conflitos pendentes" valor={conflitosPendentes} descricao="Exigem decisão do NUTEC/Administrador" />
        <SarhStatusCard titulo="Itens com erro" valor={itensComErro} descricao="Registros não processados corretamente" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <SarhSyncProgressForm />

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Últimas execuções</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">Histórico operacional da integração SARH.</p>
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
                    <tr key={execucao.id} className="border-b border-slate-100 dark:border-slate-900">
                      <td className="py-2 pr-3">{formatarData(execucao.iniciadoEm)}</td>
                      <td className="py-2 pr-3">{execucao.tipo}</td>
                      <td className="py-2 pr-3">{execucao.status}</td>
                      <td className="py-2 pr-3">{execucao.modoSimulacao ? "Sim" : "Não"}</td>
                      <td className="py-2 pr-3">{execucao.totalRecebidos}</td>
                      <td className="py-2 pr-3">{execucao.totalCriados}</td>
                      <td className="py-2 pr-3">{execucao.totalAtualizados}</td>
                      <td className="py-2 pr-3">{execucao.totalErros}</td>
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
