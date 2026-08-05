"use client";

import { useActionState } from "react";
import { AlertCircle, Building2, CheckCircle2 } from "lucide-react";

import {
  CompetenciaInput,
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import {
  configurarBancoHorasLoteAction,
  type BancoHorasLoteActionState,
} from "../../application/actions/gerenciar-banco-horas-admin.actions";
import { AplicarLoteBancoHorasButton } from "./aplicar-lote-banco-horas-button";

type ServidorLoteBancoHoras = {
  id: string;
  matricula: string;
  nomeFuncional?: string | null;
  orgao: { sigla: string; nome: string };
  usuario: { nome: string };
  lotacoes: Array<{
    unidade: { sigla: string; nome: string };
  }>;
};

type OpcaoSelecao = {
  id: string;
  label: string;
};

const estadoInicial: BancoHorasLoteActionState = {
  status: "idle",
  mensagem: "",
};

function competenciaAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function unidadeAtual(servidor: ServidorLoteBancoHoras) {
  return servidor.lotacoes[0]?.unidade.sigla ?? "-";
}

function opcoesServidores(
  servidores: ServidorLoteBancoHoras[],
): SearchableSelectOption[] {
  return servidores.map((servidor) => ({
    value: servidor.id,
    label: `${servidor.matricula} - ${nomeServidor(servidor)}`,
    searchText: `${servidor.matricula} ${nomeServidor(servidor)} ${servidor.orgao.sigla} ${unidadeAtual(servidor)}`,
  }));
}

function opcoesSelecao(opcoes: OpcaoSelecao[]): SearchableSelectOption[] {
  return opcoes.map((opcao) => ({
    value: opcao.id,
    label: opcao.label,
    searchText: opcao.label,
  }));
}

function AjudaCampo({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 min-h-10 text-xs leading-5 text-[var(--muted-foreground)]">
      {children}
    </p>
  );
}

function MensagemLote({ estado }: { estado: BancoHorasLoteActionState }) {
  if (estado.status === "idle" || !estado.mensagem) {
    return null;
  }

  const sucesso = estado.status === "sucesso";

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        sucesso
          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
      ].join(" ")}
    >
      {sucesso ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <span>{estado.mensagem}</span>
    </div>
  );
}

export function OperacaoLoteBancoHorasForm({
  servidores,
  orgaos,
  unidades,
}: {
  servidores: ServidorLoteBancoHoras[];
  orgaos: OpcaoSelecao[];
  unidades: OpcaoSelecao[];
}) {
  const [estado, formAction] = useActionState(
    configurarBancoHorasLoteAction,
    estadoInicial,
  );
  const servidoresOptions = opcoesServidores(servidores);
  const unidadesOptions = opcoesSelecao(unidades);
  const orgaosOptions = opcoesSelecao(orgaos);

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Building2 className="size-5" aria-hidden="true" />
            Implantação e zeramento em lote
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Defina um marco de controle para servidor, unidade ou seccional e
            registre saldo inicial herdado de sistema legado.
          </p>
        </div>
      </div>

      <MensagemLote estado={estado} />

      <form
        action={formAction}
        className="mt-4 grid gap-x-3 gap-y-4 lg:grid-cols-12 lg:items-start"
      >
        <label className="text-sm font-semibold lg:col-span-2">
          Escopo
          <select
            name="escopoTipo"
            defaultValue="SERVIDOR"
            className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
          >
            <option value="SERVIDOR">Servidor</option>
            <option value="UNIDADE">Unidade/departamento</option>
            <option value="ORGAO">Seccional</option>
          </select>
          <AjudaCampo>
            Define se a operação será aplicada a um servidor, a uma unidade ou
            a toda a seccional.
          </AjudaCampo>
        </label>

        <div className="text-sm font-semibold lg:col-span-4">
          Servidor
          <SearchableSelect
            id="servidorIdLote"
            name="servidorId"
            options={servidoresOptions}
            placeholder="Selecione quando o escopo for servidor"
            searchPlaceholder="Pesquisar por nome, matrícula, unidade ou seccional"
            emptyMessage="Nenhum servidor encontrado."
            className="mt-1"
          />
          <AjudaCampo>
            Use quando a implantação ou ajuste deve alcançar apenas uma pessoa.
          </AjudaCampo>
        </div>

        <div className="text-sm font-semibold lg:col-span-3">
          Unidade
          <SearchableSelect
            id="unidadeIdLote"
            name="unidadeId"
            options={unidadesOptions}
            placeholder="Selecione quando o escopo for unidade"
            searchPlaceholder="Pesquisar unidade por sigla ou nome"
            emptyMessage="Nenhuma unidade encontrada."
            className="mt-1"
          />
          <AjudaCampo>
            Use para aplicar o marco e o saldo inicial aos servidores lotados na
            unidade escolhida.
          </AjudaCampo>
        </div>

        <div className="text-sm font-semibold lg:col-span-3">
          Seccional
          <SearchableSelect
            id="orgaoIdLote"
            name="orgaoId"
            options={orgaosOptions}
            placeholder="Selecione quando o escopo for seccional"
            searchPlaceholder="Pesquisar seccional por sigla ou nome"
            emptyMessage="Nenhuma seccional encontrada."
            className="mt-1"
          />
          <AjudaCampo>
            Use quando a regra de implantação deve valer para toda a seccional
            selecionada.
          </AjudaCampo>
        </div>

        <div className="lg:col-span-2">
          <CompetenciaInput
            id="competenciaInicioControleLote"
            name="competenciaInicioControle"
            label="Competência inicial"
            defaultValue={competenciaAtual()}
          />
          <AjudaCampo>
            Indica a partir de qual competência o SECP passa a controlar o
            banco de horas.
          </AjudaCampo>
        </div>

        <label className="text-sm font-semibold lg:col-span-2">
          Saldo positivo
          <input
            name="saldoInicialCreditoHoras"
            type="number"
            min="0"
            max="9999"
            step="0.01"
            defaultValue="0"
            className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
          />
          <AjudaCampo>
            Horas positivas trazidas de controle anterior.
          </AjudaCampo>
        </label>

        <label className="text-sm font-semibold lg:col-span-2">
          Saldo negativo
          <input
            name="saldoInicialDebitoHoras"
            type="number"
            min="0"
            max="9999"
            step="0.01"
            defaultValue="0"
            className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
          />
          <AjudaCampo>
            Horas negativas trazidas de controle anterior.
          </AjudaCampo>
        </label>

        <label className="text-sm font-semibold lg:col-span-2">
          Processo SEI
          <input
            name="processoSei"
            maxLength={80}
            className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
          />
          <AjudaCampo>
            Número do processo administrativo que fundamenta o ajuste.
          </AjudaCampo>
        </label>

        <label className="text-sm font-semibold lg:col-span-4">
          Ato/autorização
          <input
            name="atoAutorizativo"
            maxLength={160}
            className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
          />
          <AjudaCampo>
            Informe portaria, despacho ou autorização que justifica a operação.
          </AjudaCampo>
        </label>

        <div className="lg:col-span-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              name="incluirSubunidades"
              type="checkbox"
              className="size-4 rounded border"
            />
            Incluir unidades subordinadas
          </label>
          <AjudaCampo>
            Quando o escopo for unidade, inclui também as unidades abaixo dela
            na hierarquia.
          </AjudaCampo>
        </div>

        <div className="lg:col-span-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              name="zerarMovimentosAnteriores"
              type="checkbox"
              defaultChecked
              className="size-4 rounded border"
            />
            Zerar saldo anterior ao marco
          </label>
          <AjudaCampo>
            Desconsidera movimentos anteriores à competência inicial e mantém o
            novo saldo de implantação.
          </AjudaCampo>
        </div>

        <label className="text-sm font-semibold lg:col-span-8">
          Justificativa
          <textarea
            name="justificativa"
            required
            minLength={10}
            rows={3}
            className="mt-1 w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
            defaultValue="Implantação ou ajuste administrativo do controle de banco de horas no SECP."
          />
          <AjudaCampo>
            Explique o motivo da implantação, zeramento ou saldo inicial.
          </AjudaCampo>
        </label>

        <label className="text-sm font-semibold lg:col-span-2">
          Confirmação
          <input
            name="confirmacao"
            placeholder="CONFIRMAR"
            className="mt-1 h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
          />
          <AjudaCampo>
            Digite CONFIRMAR para liberar a aplicação em lote e evitar operação
            acidental.
          </AjudaCampo>
        </label>

        <AplicarLoteBancoHorasButton />
      </form>
    </section>
  );
}
