"use client";

import { useActionState, useState } from "react";
import { PenLine } from "lucide-react";

import { Button, Modal } from "@/components/ui";
import { homologarServidorMesAction } from "../../application/actions/homologar-servidor-mes.action";

type AssinaturaInfo = {
  orgao?: string | null;
  assinante?: string | null;
  cargoFuncoes?: string[];
};

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
        <option value="DEVOLVIDO">Devolver para correção</option>
      </select>

      <textarea
        name="observacaoChefia"
        rows={3}
        value={observacaoChefia}
        onChange={(event) => setObservacaoChefia(event.target.value)}
        placeholder="Observação da chefia, quando necessário."
        className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
      />

      <Button
        type="button"
        className="w-full"
        onClick={() => setOpen(true)}
        leftIcon={<PenLine className="size-4" aria-hidden="true" />}
      >
        Assinar e registrar decisão
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Assinatura de Documento"
        description="Assine a decisão de homologação do espelho de ponto."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <BotaoAssinarHomologacao pending={pending} />
          </>
        }
      >
        <form
          id={`homologar-servidor-assinatura-form-${homologacaoServidorId}`}
          action={formAction}
          className="space-y-4"
        >
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

          <CampoAssinatura label="Órgão do Assinante" value={assinatura?.orgao || "SECP"} />
          <CampoAssinatura
            label="Assinante"
            value={assinatura?.assinante || "Usuário logado"}
          />
          <CampoCargoFuncao
            opcoes={assinatura?.cargoFuncoes ?? ["Não informado"]}
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
        Cargo / Função
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

function BotaoAssinarHomologacao({ pending }: { pending: boolean }) {
  return (
    <Button
      type="button"
      loading={pending}
      leftIcon={<PenLine className="size-4" aria-hidden="true" />}
      onClick={(event) => {
        const modal = event.currentTarget.closest('[role="dialog"]');
        const form = modal?.querySelector("form");
        if (form instanceof HTMLFormElement) {
          event.preventDefault();
          form.requestSubmit();
        }
      }}
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
