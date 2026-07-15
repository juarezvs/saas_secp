"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2, Save } from "lucide-react";
import { registrarEquipamentoBiometricoAction } from "../../application/actions/registrar-equipamento-biometrico.action";
import type { EquipamentoBiometricoFormState } from "../../application/schemas/integracao.schema";

type UnidadeItem = {
  id: string;
  sigla: string;
  nome: string;
  orgaoId?: string | null;
  orgao?: {
    sigla: string;
    nome: string;
  } | null;
};

type OrgaoItem = {
  id: string;
  sigla: string;
  nome: string;
};

type EquipamentoFormItem = {
  id: string;
  codigo: string;
  nome: string;
  fabricante: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  localizacao: string | null;
  ip: string | null;
  porta: number | null;
  ativo: boolean;
  orgaoId?: string | null;
  unidadeId?: string | null;
  configuracao: unknown;
};

const estadoInicial: EquipamentoBiometricoFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: EquipamentoBiometricoFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

function getConfiguracao(configuracao: unknown) {
  return configuracao && typeof configuracao === "object"
    ? (configuracao as Record<string, unknown>)
    : {};
}

function valorCampo(
  estado: EquipamentoBiometricoFormState,
  campo: string,
  fallback: unknown,
) {
  const valor = estado.campos?.[campo as never];

  if (valor !== undefined) {
    return typeof valor === "boolean" ? valor : String(valor ?? "");
  }

  return typeof fallback === "boolean" ? fallback : String(fallback ?? "");
}

function valorTextoCampo(
  estado: EquipamentoBiometricoFormState,
  campo: string,
  fallback: unknown,
) {
  const valor = valorCampo(estado, campo, fallback);
  return typeof valor === "boolean" ? String(valor) : valor;
}

function valorBooleanoCampo(
  estado: EquipamentoBiometricoFormState,
  campo: string,
  fallback: boolean,
) {
  const valor = valorCampo(estado, campo, fallback);

  if (typeof valor === "boolean") return valor;

  return valor === "true" || valor === "on";
}

function rotuloUnidade(unidade: UnidadeItem) {
  const orgao = unidade.orgao?.sigla ? `${unidade.orgao.sigla} / ` : "";
  return `${orgao}${unidade.sigla} - ${unidade.nome}`;
}

export function EquipamentoBiometricoForm({
  orgaos,
  unidades,
  equipamento,
  compacto = false,
}: {
  orgaos: OrgaoItem[];
  unidades: UnidadeItem[];
  equipamento?: EquipamentoFormItem | null;
  compacto?: boolean;
}) {
  const ehEdicao = Boolean(equipamento?.id);
  const [estado, formAction, pendente] = useActionState(
    registrarEquipamentoBiometricoAction,
    estadoInicial,
  );
  const configuracao = getConfiguracao(equipamento?.configuracao);
  const protocolo =
    configuracao.protocolo === "HENRY_LUMEN_BALCAO"
      ? "HENRY_LUMEN_BALCAO"
      : configuracao.protocolo === "DIMEP_SMART_PRINT"
        ? "DIMEP_SMART_PRINT"
      : configuracao.protocolo === "CONTROL_ID_IDCLASS_BIO"
        ? "CONTROL_ID_IDCLASS_BIO"
      : configuracao.protocolo === "CONTROL_ID_FACE_ID" ||
          equipamento?.fabricante === "CONTROL_ID"
        ? "CONTROL_ID_FACE_ID"
      : configuracao.protocolo === "HENRY" ||
          equipamento?.fabricante === "HENRY"
        ? "HENRY"
        : "GENERIC";

  return (
    <form
      action={formAction}
      className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
    >
      <input type="hidden" name="equipamentoId" value={ehEdicao ? equipamento?.id : ""} />

      <h2 className="text-lg font-bold">
        {ehEdicao ? "Editar equipamento biometrico" : "Cadastrar equipamento biometrico"}
      </h2>

      {estado.mensagem && (
        <div
          role="alert"
          className={`mt-4 rounded-lg border p-3 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {estado.mensagem}
        </div>
      )}

      <div className={`mt-5 grid gap-4 ${compacto ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
        <Campo
          label="Código"
          name="codigo"
          defaultValue={valorCampo(estado, "codigo", equipamento?.codigo)}
          erro={erro(estado, "codigo")}
          required
        />

        <Campo
          label="Nome"
          name="nome"
          defaultValue={valorCampo(estado, "nome", equipamento?.nome)}
          erro={erro(estado, "nome")}
          required
        />

        <div className="space-y-2">
          <label htmlFor="orgaoId" className="text-sm font-semibold">
            Orgao
          </label>

          <select
            id="orgaoId"
            name="orgaoId"
            required
            defaultValue={valorTextoCampo(
              estado,
              "orgaoId",
              equipamento?.orgaoId ?? "",
            )}
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          >
            <option value="">Selecione o orgao</option>
            {orgaos.map((orgao) => (
              <option key={orgao.id} value={orgao.id}>
                {orgao.sigla} - {orgao.nome}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--muted-foreground)]">
            Use este campo para transferir o equipamento entre seccionais.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="unidadeId" className="text-sm font-semibold">
            Unidade operacional
          </label>

          <select
            id="unidadeId"
            name="unidadeId"
            defaultValue={valorTextoCampo(
              estado,
              "unidadeId",
              equipamento?.unidadeId ?? "",
            )}
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          >
            <option value="">Sem unidade vinculada</option>
            {unidades.map((unidade) => (
              <option key={unidade.id} value={unidade.id}>
                {rotuloUnidade(unidade)}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--muted-foreground)]">
            Opcional. Use quando o relogio estiver sob responsabilidade direta
            de uma unidade.
          </p>
        </div>

        <Campo
          label="Fabricante"
          name="fabricante"
          defaultValue={valorCampo(estado, "fabricante", equipamento?.fabricante)}
        />
        <Campo
          label="Modelo"
          name="modelo"
          defaultValue={valorCampo(estado, "modelo", equipamento?.modelo)}
        />
        <Campo
          label="Numero de serie"
          name="numeroSerie"
          defaultValue={valorCampo(estado, "numeroSerie", equipamento?.numeroSerie)}
        />
        <Campo
          label="Localizacao"
          name="localizacao"
          defaultValue={valorCampo(estado, "localizacao", equipamento?.localizacao)}
        />
        <Campo
          label="IP"
          name="ip"
          defaultValue={valorCampo(estado, "ip", equipamento?.ip)}
        />
        <Campo
          label="Porta"
          name="porta"
          type="number"
          defaultValue={valorCampo(estado, "porta", equipamento?.porta)}
        />

        <div className="space-y-2">
          <label htmlFor="protocolo" className="text-sm font-semibold">
            Protocolo de integracao
          </label>

          <select
            id="protocolo"
            name="protocolo"
            defaultValue={valorTextoCampo(estado, "protocolo", protocolo)}
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          >
            <option value="GENERIC">Generico / webhook</option>
            <option value="HENRY">Henry - Linha ADV</option>
            <option value="HENRY_LUMEN_BALCAO">
              Henry Lumen Balcao LT - Primme Acesso 8X
            </option>
            <option value="DIMEP_SMART_PRINT">
              Dimep Smart Print / Smart Print-Pro
            </option>
            <option value="CONTROL_ID_FACE_ID">Control iD - FACE ID</option>
            <option value="CONTROL_ID_IDCLASS_BIO">
              Control iD - idClass Bio
            </option>
          </select>
        </div>

        <Campo
          label="Usuário padrão do relógio"
          name="usuario"
          defaultValue={valorCampo(estado, "usuario", configuracao.usuario)}
        />
        <Campo
          label="Senha padrao do relogio"
          name="senha"
          defaultValue={valorTextoCampo(estado, "senha", configuracao.senha)}
          placeholder={ehEdicao ? "Senha atual carregada" : undefined}
          senha
        />
        <Campo
          label="Usuário para dados/coleta"
          name="usuarioDados"
          defaultValue={valorCampo(estado, "usuarioDados", configuracao.usuarioDados)}
        />
        <Campo
          label="Senha para dados/coleta"
          name="senhaDados"
          defaultValue={valorTextoCampo(
            estado,
            "senhaDados",
            configuracao.senhaDados,
          )}
          placeholder={ehEdicao ? "Senha atual carregada" : undefined}
          senha
        />
        <Campo
          label="Usuário para configuração"
          name="usuarioConfiguracao"
          defaultValue={valorCampo(
            estado,
            "usuarioConfiguracao",
            configuracao.usuarioConfiguracao,
          )}
        />
        <Campo
          label="Senha para configuracao"
          name="senhaConfiguracao"
          defaultValue={valorTextoCampo(
            estado,
            "senhaConfiguracao",
            configuracao.senhaConfiguracao,
          )}
          placeholder={ehEdicao ? "Senha atual carregada" : undefined}
          senha
        />
        <Campo
          label="Timeout (ms)"
          name="timeoutMs"
          type="number"
          defaultValue={valorCampo(estado, "timeoutMs", configuracao.timeoutMs)}
        />
        <Campo
          label="Proximo NSR de coleta"
          name="proximoNsrColeta"
          type="number"
          defaultValue={valorCampo(
            estado,
            "proximoNsrColeta",
            configuracao.proximoNsrColeta,
          )}
        />
        <Campo
          label="Token webhook do equipamento"
          name="webhookToken"
          defaultValue={valorCampo(estado, "webhookToken", configuracao.webhookToken)}
        />

        <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={valorBooleanoCampo(
              estado,
              "ativo",
              equipamento?.ativo ?? true,
            )}
          />
          <span>
            <span className="block font-semibold">Equipamento ativo</span>
            <span className="text-xs text-[var(--muted-foreground)]">
              Equipamentos inativos nao devem gerar marcacoes.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-60"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {ehEdicao ? "Atualizar equipamento" : "Salvar equipamento"}
        </button>
      </div>
    </form>
  );
}

function Campo({
  label,
  name,
  type = "text",
  erro,
  required,
  defaultValue,
  placeholder,
  senha = false,
}: {
  label: string;
  name: string;
  type?: string;
  erro?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  placeholder?: string;
  senha?: boolean;
}) {
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const inputType = senha ? (mostrarSenha ? "text" : "password") : type;

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-semibold">
        {label}
      </label>

      <div className="relative">
        <input
          id={name}
          name={name}
          type={inputType}
          required={required}
          defaultValue={
            typeof defaultValue === "boolean"
              ? undefined
              : String(defaultValue ?? "")
          }
          placeholder={placeholder}
          className={`h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm ${
            senha ? "pr-10" : ""
          }`}
        />

        {senha && (
          <button
            type="button"
            onClick={() => setMostrarSenha((valor) => !valor)}
            className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            aria-label={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
            title={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
          >
            {mostrarSenha ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}
