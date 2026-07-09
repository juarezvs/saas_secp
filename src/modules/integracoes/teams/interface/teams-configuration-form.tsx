"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import type { TeamsConfiguracaoFormState } from "../application/salvar-teams-configuracao.action";

type ConfiguracaoTeams = {
  ativo: boolean;
  ambiente: string;
  microsoftAppId: string | null;
  tenantId: string | null;
  botEndpoint: string | null;
  messagingEndpoint: string | null;
  urlPublicaSecp: string | null;
  politicaEnvioNotificacoes: string;
  botConversacionalAtivo: boolean;
  notificacoesAtivas: boolean;
  adaptiveCardsAtivos: boolean;
  abasTeamsAtivas: boolean;
  registroPontoAtivo: boolean;
  consultaBancoHorasAtiva: boolean;
  aprovacoesAtivas: boolean;
  homologacoesAtivas: boolean;
};

type Props = {
  configuracao: ConfiguracaoTeams;
  possuiSecret: boolean;
  action: (
    state: TeamsConfiguracaoFormState,
    formData: FormData,
  ) => Promise<TeamsConfiguracaoFormState>;
};

const estadoInicial: TeamsConfiguracaoFormState = {
  sucesso: false,
  mensagem: null,
};

const campo =
  "h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20";

const recursos = [
  ["botConversacionalAtivo", "Bot conversacional"],
  ["notificacoesAtivas", "Notificações individuais"],
  ["adaptiveCardsAtivos", "Adaptive Cards"],
  ["abasTeamsAtivas", "Abas do Teams"],
  ["registroPontoAtivo", "Registro de ponto pelo Teams"],
  ["consultaBancoHorasAtiva", "Consulta de banco de horas"],
  ["aprovacoesAtivas", "Aprovações pela chefia"],
  ["homologacoesAtivas", "Homologações pelo Teams"],
] as const;

export function TeamsConfigurationForm({
  configuracao,
  possuiSecret,
  action,
}: Props) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  return (
    <form action={formAction} className="space-y-6">
      {estado.mensagem && (
        <div
          role="alert"
          className={`rounded-md border p-3 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {estado.mensagem}
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Configuração</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Controle central da integração Microsoft Teams do SECP.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="ativo"
              defaultChecked={configuracao.ativo}
              className="size-4"
            />
            Ativa
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Ambiente</span>
            <select
              name="ambiente"
              defaultValue={configuracao.ambiente}
              className={campo}
            >
              <option value="desenvolvimento">Desenvolvimento</option>
              <option value="homologacao">Homologação</option>
              <option value="producao">Produção</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">
              Política de notificações
            </span>
            <select
              name="politicaEnvioNotificacoes"
              defaultValue={configuracao.politicaEnvioNotificacoes}
              className={campo}
            >
              <option value="somente_vinculados">Somente vinculados</option>
              <option value="todos_vinculados">Todos os vinculados</option>
              <option value="desativado">Desativado</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">Microsoft App ID</span>
            <input
              name="microsoftAppId"
              defaultValue={configuracao.microsoftAppId ?? ""}
              className={campo}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">
              Microsoft App Password/Secret
            </span>
            <input
              name="microsoftAppSecret"
              type="password"
              placeholder={possuiSecret ? "Secret já configurado" : ""}
              className={campo}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">Tenant ID</span>
            <input
              name="tenantId"
              defaultValue={configuracao.tenantId ?? ""}
              className={campo}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">URL pública do SECP</span>
            <input
              name="urlPublicaSecp"
              defaultValue={configuracao.urlPublicaSecp ?? ""}
              className={campo}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">Bot Endpoint</span>
            <input
              name="botEndpoint"
              defaultValue={configuracao.botEndpoint ?? ""}
              placeholder="/api/bot/teams/messages"
              className={campo}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold">Messaging Endpoint</span>
            <input
              name="messagingEndpoint"
              defaultValue={configuracao.messagingEndpoint ?? ""}
              className={campo}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-bold">Recursos habilitados</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {recursos.map(([name, label]) => (
            <label
              key={name}
              className="flex items-center justify-between rounded-md border bg-[var(--muted)] px-3 py-2 text-sm"
            >
              <span className="font-semibold">{label}</span>
              <input
                type="checkbox"
                name={name}
                defaultChecked={Boolean(configuracao[name])}
                className="size-4"
              />
            </label>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-70"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Salvar integração Teams
        </button>
      </div>
    </form>
  );
}
