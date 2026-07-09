import { Bot, ShieldCheck } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { salvarTeamsConfiguracaoAction } from "@/modules/integracoes/teams/application/salvar-teams-configuracao.action";
import {
  listarTeamsLogsRecentes,
  obterOuCriarTeamsConfiguracao,
} from "@/modules/integracoes/teams/application/teams-configuracao.service";
import { TEAMS_PERMISSOES_ADMIN } from "@/modules/integracoes/teams/domain/teams-permissoes";
import { TeamsConfigurationForm } from "@/modules/integracoes/teams/interface/teams-configuration-form";
import { TeamsTestPanel } from "@/modules/integracoes/teams/interface/teams-test-panel";

export default async function IntegracaoTeamsPage() {
  await exigirUmaDasPermissoesOuRedirecionar([...TEAMS_PERMISSOES_ADMIN]);

  const [configuracao, logs] = await Promise.all([
    obterOuCriarTeamsConfiguracao(),
    listarTeamsLogsRecentes(12),
  ]);

  return (
    <main className="space-y-6 p-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          {
            label: "Integrações por seccional",
            href: "/administracao/integracoes",
          },
          { label: "Microsoft Teams" },
        ]}
      />

      <PageHeader
        icon={Bot}
        titulo="Microsoft Teams"
        descricao="Configure bot, abas, notificações, Adaptive Cards e manifesto do aplicativo Teams do SECP."
        artigo="SECP para Microsoft Teams"
        regraTitulo="Controle administrativo obrigatório"
        regraDescricao="Nenhuma rotina Teams executa ação sensível se a integração, o recurso específico e as permissões RBAC não estiverem ativos."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Status geral</p>
          <p className="mt-2 text-2xl font-black">
            {configuracao.ativo ? "Ativa" : "Inativa"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Ambiente</p>
          <p className="mt-2 text-2xl font-black capitalize">
            {configuracao.ambiente}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Manifesto</p>
          <p className="mt-2 text-2xl font-black">
            {configuracao.microsoftAppId ? "Configurável" : "Pendente"}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" />
          <p>
            O secret do Microsoft App é armazenado criptografado. Não exponha
            payloads sensíveis nos logs e substitua os ícones padrão do pacote
            antes de publicar o aplicativo no catálogo corporativo do Teams.
          </p>
        </div>
      </section>

      <TeamsConfigurationForm
        action={salvarTeamsConfiguracaoAction}
        configuracao={configuracao}
        possuiSecret={Boolean(configuracao.microsoftAppSecretCriptografado)}
      />

      <TeamsTestPanel />

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-bold">Logs recentes</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="py-2">Quando</th>
                <th>Tipo</th>
                <th>Direção</th>
                <th>Evento</th>
                <th>Status</th>
                <th>Erro</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="py-2">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(log.criadoEm)}
                  </td>
                  <td>{log.tipo}</td>
                  <td>{log.direcao}</td>
                  <td>{log.evento}</td>
                  <td>{log.sucesso ? "Sucesso" : "Atenção"}</td>
                  <td className="max-w-xs truncate">{log.erro ?? "-"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum log Teams registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
