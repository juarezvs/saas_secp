"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, PenLine, RotateCcw, ShieldAlert } from "lucide-react";

import { Button, Modal } from "@/components/ui";
import { homologarServidorMesAction } from "../../application/actions/homologar-servidor-mes.action";

type AssinaturaInfo = {
  orgao?: string | null;
  assinante?: string | null;
  cargoFuncoes?: string[];
};

const STATUS_COM_OBSERVACAO_OBRIGATORIA = [
  "HOMOLOGADO_COM_RESSALVA",
  "DEVOLVIDO",
];

export function HomologarServidorForm({
  homologacaoServidorId,
  assinatura,
}: {
  homologacaoServidorId: string;
  assinatura?: AssinaturaInfo;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("HOMOLOGADO");
  const [observacaoChefia, setObservacaoChefia] = useState("");
  const [state, formAction, pending] = useActionState(
    homologarServidorMesAction,
    { erro: null },
  );
  const formId = `homologar-servidor-assinatura-form-${homologacaoServidorId}`;
  const decisaoExigeObservacao =
    STATUS_COM_OBSERVACAO_OBRIGATORIA.includes(status);

  function abrirAssinatura(proximoStatus: string) {
    setStatus(proximoStatus);

    if (
      STATUS_COM_OBSERVACAO_OBRIGATORIA.includes(proximoStatus) &&
      !observacaoChefia.trim()
    ) {
      return;
    }

    setOpen(true);
  }

  return (
    <div className="space-y-3">
      <select
        name="status"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
      >
        <option value="HOMOLOGADO">Homologar</option>
        <option value="HOMOLOGADO_COM_RESSALVA">Homologar com ressalva</option>
        <option value="DEVOLVIDO">Devolver para correcao</option>
      </select>

      <textarea
        name="observacaoChefia"
        rows={3}
        value={observacaoChefia}
        onChange={(event) => setObservacaoChefia(event.target.value)}
        placeholder={
          decisaoExigeObservacao
            ? "Informe a ressalva ou o motivo da devolucao."
            : "Observacao da chefia, quando necessario."
        }
        className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
      />

      {decisaoExigeObservacao && !observacaoChefia.trim() ? (
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          Informe a ressalva ou o motivo da devolucao antes de assinar.
        </p>
      ) : null}

      <div className="grid gap-2">
        <Button
          type="button"
          className="w-full"
          onClick={() => abrirAssinatura("HOMOLOGADO")}
          leftIcon={<CheckCircle2 className="size-4" aria-hidden="true" />}
        >
          Homologar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => abrirAssinatura("HOMOLOGADO_COM_RESSALVA")}
          leftIcon={<ShieldAlert className="size-4" aria-hidden="true" />}
        >
          Homologar com ressalva
        </Button>
        <Button
          type="button"
          variant="danger"
          className="w-full"
          onClick={() => abrirAssinatura("DEVOLVIDO")}
          leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}
        >
          Devolver para correcao
        </Button>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Assinatura de Documento"
        description="Assine a decisao de homologacao do espelho de ponto."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <BotaoAssinarHomologacao pending={pending} formId={formId} />
          </>
        }
      >
        <form id={formId} action={formAction} className="space-y-4">
          <input
            type="hidden"
            name="homologacaoServidorId"
            value={homologacaoServidorId}
          />
          <input type="hidden" name="status" value={status} />
          <input
            type="hidden"
            name="observacaoChefia"
            value={observacaoChefia}
          />

          <CampoAssinatura
            label="Orgao do Assinante"
            value={assinatura?.orgao || "SECP"}
          />
          <CampoAssinatura
            label="Assinante"
            value={assinatura?.assinante || "Usuario logado"}
          />
          <CampoCargoFuncao
            opcoes={assinatura?.cargoFuncoes ?? ["Nao informado"]}
            inputId={`cargoFuncaoAssinaturaHomologacao-${homologacaoServidorId}`}
          />

          <div>
            <label
              htmlFor={`senhaAssinaturaHomologacao-${homologacaoServidorId}`}
              className="text-sm font-semibold"
            >
              Senha
            </label>
            <input
              id={`senhaAssinaturaHomologacao-${homologacaoServidorId}`}
              name="senhaAssinatura"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />
            {state.erro ? (
              <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">
                {state.erro}
              </p>
            ) : null}
          </div>
        </form>
      </Modal>
    </div>
  );
}

function CampoCargoFuncao({
  opcoes,
  inputId,
}: {
  opcoes: string[];
  inputId: string;
}) {
  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-semibold">
        Cargo / Funcao
      </label>
      <select
        id={inputId}
        name="cargoFuncaoAssinatura"
        defaultValue={opcoes[0]}
        className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
      >
        {opcoes.map((opcao) => (
          <option key={opcao} value={opcao}>
            {opcao}
          </option>
        ))}
      </select>
    </div>
  );
}

function BotaoAssinarHomologacao({
  pending,
  formId,
}: {
  pending: boolean;
  formId: string;
}) {
  return (
    <Button
      type="submit"
      form={formId}
      loading={pending}
      leftIcon={<PenLine className="size-4" aria-hidden="true" />}
    >
      Assinar
    </Button>
  );
}

function CampoAssinatura({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <input
        value={value}
        readOnly
        className="mt-2 h-10 w-full rounded-md border bg-[var(--muted)] px-3 text-sm"
      />
    </div>
  );
}
