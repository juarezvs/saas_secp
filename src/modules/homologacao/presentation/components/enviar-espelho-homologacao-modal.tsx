"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, PenLine } from "lucide-react";

import { Button, Modal } from "@/components/ui";
import { enviarEspelhoHomologacaoAction } from "../../application/actions/enviar-espelho-homologacao.action";

type AssinaturaInfo = {
  orgao?: string | null;
  assinante?: string | null;
  cargoFuncoes?: string[];
};

type EnviarEspelhoHomologacaoModalProps = {
  anoReferencia: number;
  mesReferencia: number;
  assinatura?: AssinaturaInfo;
};

function BotaoAssinarEnviar({ pending }: { pending: boolean }) {
  return (
    <Button
      type="button"
      variant="danger"
      loading={pending}
      leftIcon={<PenLine className="size-4" aria-hidden="true" />}
      onClick={(event) => {
        const modal = event.currentTarget.closest('[role="dialog"]');
        const form = modal?.querySelector("form");
        if (form instanceof HTMLFormElement) {
          form.requestSubmit();
        }
      }}
    >
      Assinar e enviar
    </Button>
  );
}

export function EnviarEspelhoHomologacaoModal({
  anoReferencia,
  mesReferencia,
  assinatura,
}: EnviarEspelhoHomologacaoModalProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    enviarEspelhoHomologacaoAction,
    { erro: null, sucesso: null },
  );
  const competencia = `${String(mesReferencia).padStart(2, "0")}/${anoReferencia}`;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        leftIcon={<PenLine className="size-4" aria-hidden="true" />}
      >
        Assinar e enviar para homologação
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Assinatura de Documento"
        description={`Assine o envio do espelho de ponto da competência ${competencia} para a chefia.`}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <BotaoAssinarEnviar pending={pending} />
          </>
        }
      >
        <form
          id="enviar-espelho-assinatura-form"
          action={formAction}
          className="space-y-4"
        >
          <input type="hidden" name="anoReferencia" value={anoReferencia} />
          <input type="hidden" name="mesReferencia" value={mesReferencia} />

          <CampoAssinatura label="Órgão do Assinante" value={assinatura?.orgao || "SECP"} />
          <CampoAssinatura
            label="Assinante"
            value={assinatura?.assinante || "Usuário logado"}
          />
          <CampoCargoFuncao
            opcoes={assinatura?.cargoFuncoes ?? ["Não informado"]}
          />

          <div>
            <label htmlFor="senhaAssinaturaEnvio" className="text-sm font-semibold">
              Senha
            </label>
            <input
              id="senhaAssinaturaEnvio"
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
            {state.sucesso ? (
              <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {state.sucesso}
              </p>
            ) : null}
          </div>
        </form>

        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">Esta ação é irreversível.</p>
              <p className="mt-1">
                Depois do envio, você não poderá criar solicitações de ajuste,
                justificativa, compensação ou qualquer outro pedido que possa
                alterar este espelho de ponto. A competência ficará aguardando a
                análise e homologação da chefia.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

function CampoCargoFuncao({ opcoes }: { opcoes: string[] }) {
  return (
    <div>
      <label htmlFor="cargoFuncaoAssinaturaEnvio" className="text-sm font-semibold">
        Cargo / Função
      </label>
      <select
        id="cargoFuncaoAssinaturaEnvio"
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
