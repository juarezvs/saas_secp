"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { SearchableSelect } from "@/components/ui/searchable-select";

import type { SubstituicaoFuncaoFormState } from "../actions/substituicoes-funcao.actions";

type Opcao = {
  id: string;
  label: string;
  descricao?: string | null;
};

type ValoresIniciais = {
  orgaoId?: string | null;
  unidadeId?: string | null;
  titularServidorId?: string | null;
  substitutoServidorId?: string | null;
  funcaoTitularId?: string | null;
  funcaoSubstitutoId?: string | null;
  tipo?: string | null;
  status?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  atoDesignacao?: string | null;
  dataAtoDesignacao?: string | null;
  dataPublicacaoAto?: string | null;
  atoDispensa?: string | null;
  dataAtoDispensa?: string | null;
  dataPublicacaoDispensa?: string | null;
  processoSei?: string | null;
  observacao?: string | null;
};

type Props = {
  action: (
    state: SubstituicaoFuncaoFormState,
    formData: FormData,
  ) => Promise<SubstituicaoFuncaoFormState>;
  orgaos: Opcao[];
  unidades: Opcao[];
  servidores: Opcao[];
  funcoes: Opcao[];
  valores?: ValoresIniciais;
  modo: "novo" | "editar";
};

const estadoInicial: SubstituicaoFuncaoFormState = {
  sucesso: false,
  mensagem: "",
};

function erro(state: SubstituicaoFuncaoFormState, campo: string) {
  return state.erros?.[campo]?.[0] ?? null;
}

function CampoAjuda({ children }: { children: string }) {
  return (
    <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
      {children}
    </p>
  );
}

function SelectCampo({
  name,
  label,
  ajuda,
  opcoes,
  valor,
  erroMensagem,
  obrigatorio,
  placeholder = "Selecione",
}: {
  name: string;
  label: string;
  ajuda: string;
  opcoes: Opcao[];
  valor?: string | null;
  erroMensagem?: string | null;
  obrigatorio?: boolean;
  placeholder?: string;
}) {
  const id = `substituicao-funcao-${name}`;

  return (
    <label className="block">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <CampoAjuda>{ajuda}</CampoAjuda>
      <SearchableSelect
        id={id}
        name={name}
        defaultValue={valor ?? ""}
        required={obrigatorio}
        placeholder={placeholder}
        searchPlaceholder={`Pesquisar ${label.toLowerCase()}...`}
        emptyMessage={`Nenhuma opção encontrada para ${label.toLowerCase()}.`}
        className="mt-2"
        options={opcoes.map((opcao) => ({
          value: opcao.id,
          label: opcao.label,
          searchText: opcao.descricao ?? undefined,
        }))}
      />
      {erroMensagem && <p className="mt-1 text-xs text-red-700">{erroMensagem}</p>}
    </label>
  );
}

function InputCampo({
  name,
  label,
  ajuda,
  valor,
  type = "text",
  erroMensagem,
  obrigatorio,
}: {
  name: string;
  label: string;
  ajuda: string;
  valor?: string | null;
  type?: string;
  erroMensagem?: string | null;
  obrigatorio?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <CampoAjuda>{ajuda}</CampoAjuda>
      <input
        name={name}
        type={type}
        defaultValue={valor ?? ""}
        required={obrigatorio}
        className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
      />
      {erroMensagem && <p className="mt-1 text-xs text-red-700">{erroMensagem}</p>}
    </label>
  );
}

export function SubstituicaoFuncaoForm({
  action,
  orgaos,
  unidades,
  servidores,
  funcoes,
  valores,
  modo,
}: Props) {
  const [state, formAction, pending] = useActionState(action, estadoInicial);

  return (
    <form action={formAction} className="space-y-6">
      {state.mensagem && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            state.sucesso
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {state.mensagem}
        </div>
      )}

      <section className="rounded-lg border bg-[var(--card)] p-5">
        <h2 className="text-base font-semibold">Identificação</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Defina a seccional, a unidade e as pessoas envolvidas na substituição.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <SelectCampo
            name="orgaoId"
            label="Seccional"
            ajuda="Define o isolamento das regras, permissões e cálculos."
            opcoes={orgaos}
            valor={valores?.orgaoId}
            erroMensagem={erro(state, "orgaoId")}
            obrigatorio
          />
          <SelectCampo
            name="unidadeId"
            label="Unidade"
            ajuda="Opcional, mas recomendada para vincular a substituição à área funcional."
            opcoes={unidades}
            valor={valores?.unidadeId}
          />
          <SelectCampo
            name="titularServidorId"
            label="Titular"
            ajuda="Servidor que possui a função ou responsabilidade substituída."
            opcoes={servidores}
            valor={valores?.titularServidorId}
            erroMensagem={erro(state, "titularServidorId")}
            obrigatorio
          />
          <SelectCampo
            name="substitutoServidorId"
            label="Substituto"
            ajuda="Servidor que assumirá a substituição no período informado."
            opcoes={servidores}
            valor={valores?.substitutoServidorId}
            erroMensagem={erro(state, "substitutoServidorId")}
            obrigatorio
          />
        </div>
      </section>

      <section className="rounded-lg border bg-[var(--card)] p-5">
        <h2 className="text-base font-semibold">Função e vigência</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Informe a função, o tipo de substituição e o período de validade.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <SelectCampo
            name="funcaoTitularId"
            label="Função do titular"
            ajuda="Usada como referência principal para cálculo da diferença de pagamento."
            opcoes={funcoes}
            valor={valores?.funcaoTitularId}
            placeholder="Selecione a função do titular"
          />
          <SelectCampo
            name="funcaoSubstitutoId"
            label="Função do substituto"
            ajuda="Usada para descontar o valor que o substituto já recebe, quando houver."
            opcoes={funcoes}
            valor={valores?.funcaoSubstitutoId}
            placeholder="Selecione a função do substituto"
          />
          <SelectCampo
            name="tipo"
            label="Tipo"
            ajuda="Classifica a origem operacional: automática, eventual, designada ou interina."
            opcoes={[
              { id: "AUTOMATICA", label: "Automática" },
              { id: "EVENTUAL", label: "Eventual" },
              { id: "DESIGNADA", label: "Designada" },
              { id: "INTERINA", label: "Interina" },
              { id: "OUTRA", label: "Outra" },
            ]}
            valor={valores?.tipo ?? "AUTOMATICA"}
          />
          <SelectCampo
            name="status"
            label="Status"
            ajuda="Controla se a substituição está disponível para cálculo e acompanhamento."
            opcoes={[
              { id: "ATIVA", label: "Ativa" },
              { id: "INATIVA", label: "Inativa" },
              { id: "SUSPENSA", label: "Suspensa" },
              { id: "ENCERRADA", label: "Encerrada" },
            ]}
            valor={valores?.status ?? "ATIVA"}
          />
          <InputCampo
            name="dataInicio"
            label="Data de início"
            ajuda="Primeiro dia em que a substituição pode produzir efeito."
            type="date"
            valor={valores?.dataInicio}
            erroMensagem={erro(state, "dataInicio")}
            obrigatorio
          />
          <InputCampo
            name="dataFim"
            label="Data de fim"
            ajuda="Informe quando a substituição tiver encerramento previsto."
            type="date"
            valor={valores?.dataFim}
            erroMensagem={erro(state, "dataFim")}
          />
        </div>
      </section>

      <section className="rounded-lg border bg-[var(--card)] p-5">
        <h2 className="text-base font-semibold">Ato e observações</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Registre ato, publicação, processo SEI e informações úteis para auditoria.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <InputCampo
            name="atoDesignacao"
            label="Ato de designação"
            ajuda="Número ou identificação do ato que institui a substituição."
            valor={valores?.atoDesignacao}
          />
          <InputCampo
            name="dataAtoDesignacao"
            label="Data do ato"
            ajuda="Data de assinatura ou emissão do ato."
            type="date"
            valor={valores?.dataAtoDesignacao}
          />
          <InputCampo
            name="dataPublicacaoAto"
            label="Publicação do ato"
            ajuda="Data de publicação do ato, quando existir."
            type="date"
            valor={valores?.dataPublicacaoAto}
          />
          <InputCampo
            name="atoDispensa"
            label="Ato de dispensa"
            ajuda="Use quando houver ato formal encerrando a substituição."
            valor={valores?.atoDispensa}
          />
          <InputCampo
            name="dataAtoDispensa"
            label="Data da dispensa"
            ajuda="Data de assinatura ou emissão da dispensa."
            type="date"
            valor={valores?.dataAtoDispensa}
          />
          <InputCampo
            name="dataPublicacaoDispensa"
            label="Publicação da dispensa"
            ajuda="Data de publicação da dispensa, quando existir."
            type="date"
            valor={valores?.dataPublicacaoDispensa}
          />
          <InputCampo
            name="processoSei"
            label="Processo SEI"
            ajuda="Processo administrativo relacionado à substituição."
            valor={valores?.processoSei}
          />
          <label className="block lg:col-span-2">
            <span className="text-sm font-semibold text-foreground">
              Observação
            </span>
            <CampoAjuda>
              Use para registrar detalhes que não estejam nos demais campos.
            </CampoAjuda>
            <textarea
              name="observacao"
              defaultValue={valores?.observacao ?? ""}
              rows={3}
              className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 z-20 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/20 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-4" aria-hidden="true" />
          {pending
            ? "Salvando..."
            : modo === "novo"
              ? "Criar substituição"
              : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
