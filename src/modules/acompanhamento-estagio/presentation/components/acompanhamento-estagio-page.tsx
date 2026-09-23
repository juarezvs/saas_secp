"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Save } from "lucide-react";

import { Button, Modal } from "@/components/ui";
import { RelatorioExportacaoButton } from "@/modules/relatorios/presentation/components/relatorio-exportacao-button";
import {
  assinarSupervisorAcompanhamentoEstagioAction,
  devolverSupervisorAcompanhamentoEstagioAction,
  fecharAcompanhamentoEstagioAction,
  salvarAcompanhamentoEstagioAction,
} from "../../application/actions/acompanhamento-estagio.actions";
import type { DadosAcompanhamentoEstagio } from "../../application/services/acompanhamento-estagio.service";

type Props = {
  dados: DadosAcompanhamentoEstagio;
};

const estadoInicial = {
  erro: null,
  sucesso: null,
};

export function AcompanhamentoEstagioPage({ dados }: Props) {
  const router = useRouter();
  const [estadoSalvar, salvarAction, salvando] = useActionState(
    salvarAcompanhamentoEstagioAction,
    estadoInicial,
  );
  const [estadoFechar, fecharAction, fechando] = useActionState(
    fecharAcompanhamentoEstagioAction,
    estadoInicial,
  );
  const [estadoAssinarSupervisor, assinarSupervisorAction, assinandoSupervisor] =
    useActionState(assinarSupervisorAcompanhamentoEstagioAction, estadoInicial);
  const [estadoDevolverSupervisor, devolverSupervisorAction, devolvendoSupervisor] =
    useActionState(devolverSupervisorAcompanhamentoEstagioAction, estadoInicial);
  const [modalFechamentoAberto, setModalFechamentoAberto] = useState(false);
  const [modalAssinaturaSupervisorAberto, setModalAssinaturaSupervisorAberto] =
    useState(false);
  const [modalDevolucaoAberto, setModalDevolucaoAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"atual" | "anteriores">("atual");
  const fechado = dados.acompanhamento.status === "FECHADO";
  const aguardandoSupervisor =
    dados.acompanhamento.status === "AGUARDANDO_SUPERVISOR";
  const modoEstagiario = dados.modo === "ESTAGIARIO";
  const modoSupervisor = dados.modo === "SUPERVISOR";
  const possuiLinhas = dados.linhas.length > 0;
  const podeFechar = modoEstagiario && !fechado && !aguardandoSupervisor && possuiLinhas;
  const podeSupervisorAssinar = modoSupervisor && aguardandoSupervisor;
  const statusLabel = {
    ABERTO: "Aberta",
    AGUARDANDO_SUPERVISOR: "Aguardando supervisor",
    DEVOLVIDO: "Devolvida",
    FECHADO: "Fechada",
  }[dados.acompanhamento.status];
  const queryExportacao = useMemo(() => {
    const params = new URLSearchParams({
      competencia: dados.competencia.input,
    });

    if (dados.modo !== "ESTAGIARIO") {
      params.set("servidorId", dados.servidor.id);
    }

    return params.toString();
  }, [dados.competencia.input, dados.modo, dados.servidor.id]);

  useEffect(() => {
    if (
      estadoSalvar.sucesso ||
      estadoFechar.sucesso ||
      estadoAssinarSupervisor.sucesso ||
      estadoDevolverSupervisor.sucesso
    ) {
      router.refresh();
    }
  }, [
    estadoSalvar.sucesso,
    estadoFechar.sucesso,
    estadoAssinarSupervisor.sucesso,
    estadoDevolverSupervisor.sucesso,
    router,
  ]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        <section className="rounded-md border bg-[var(--card)] p-4">
          <label
            htmlFor="competenciaAcompanhamentoEstagio"
            className="text-sm font-semibold"
          >
            Competência
          </label>
          <input
            id="competenciaAcompanhamentoEstagio"
            name="competencia"
            type="month"
            defaultValue={dados.competencia.input}
            className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            onChange={(event) => {
              const params = new URLSearchParams({
                competencia: event.currentTarget.value,
              });

              if (dados.modo !== "ESTAGIARIO") {
                params.set("servidorId", dados.servidor.id);
              }

              router.push(`/acompanhamento-estagio?${params.toString()}`);
            }}
          />
          <span
            className={`mt-3 inline-flex h-9 items-center rounded-md px-3 text-sm font-semibold ${
              fechado
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                : aguardandoSupervisor
                  ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                  : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
            }`}
          >
            {statusLabel}
          </span>
        </section>

        <section className="rounded-md border bg-[var(--card)] p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CampoInfo label="EstagiÃ¡rio" value={dados.servidor.nome} />
            <CampoInfo label="MatrÃ­cula" value={dados.servidor.matricula} />
            <CampoInfo label="LotaÃ§Ã£o" value={dados.servidor.lotacao} />
            <CampoInfo label="Curso" value={dados.acompanhamento.curso} />
            <CampoInfo label="Supervisor" value={dados.acompanhamento.supervisor} />
            <CampoInfo label="MÃªs/Ano" value={dados.competencia.label} />
          </div>
          {dados.acompanhamento.devolucaoJustificativa ? (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              <strong>DevoluÃ§Ã£o:</strong>{" "}
              {dados.acompanhamento.devolucaoJustificativa}
            </div>
          ) : null}
        </section>
      </div>

      <div className="flex flex-wrap gap-2 rounded-md border bg-[var(--card)] p-2">
        <button
          type="button"
          onClick={() => setAbaAtiva("atual")}
          className={`h-10 rounded-md px-4 text-sm font-semibold ${
            abaAtiva === "atual"
              ? "bg-blue-900 text-white"
              : "hover:bg-[var(--muted)]"
          }`}
        >
          CompetÃªncia atual
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva("anteriores")}
          className={`h-10 rounded-md px-4 text-sm font-semibold ${
            abaAtiva === "anteriores"
              ? "bg-blue-900 text-white"
              : "hover:bg-[var(--muted)]"
          }`}
        >
          CompetÃªncias passadas
        </button>
      </div>

      {abaAtiva === "anteriores" ? (
        <CompetenciasAnterioresGrid competencias={dados.competenciasAnteriores} />
      ) : null}

      <form
        action={salvarAction}
        className={abaAtiva === "atual" ? "space-y-5" : "hidden"}
      >
        <input type="hidden" name="competencia" value={dados.competencia.input} />
        <input type="hidden" name="anoReferencia" value={dados.competencia.ano} />
        <input type="hidden" name="mesReferencia" value={dados.competencia.mes} />

        <section className="rounded-md border bg-[var(--card)] p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CampoInfo label="Estagiário" value={dados.servidor.nome} />
            <CampoInfo label="Matrícula" value={dados.servidor.matricula} />
            <CampoInfo label="Lotação" value={dados.servidor.lotacao} />
            <CampoInfo label="Mês/Ano" value={dados.competencia.label} />
            <CampoEditavel
              label="Curso"
              name="curso"
              value={dados.acompanhamento.curso}
              disabled={!modoEstagiario || fechado || aguardandoSupervisor}
            />
            <CampoEditavel
              label="Supervisor"
              name="supervisor"
              value={dados.acompanhamento.supervisor}
              disabled={!modoEstagiario || fechado || aguardandoSupervisor}
            />
          </div>
          {dados.acompanhamento.devolucaoJustificativa ? (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              <strong>Devolução:</strong>{" "}
              {dados.acompanhamento.devolucaoJustificativa}
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-md border bg-[var(--card)]">
          <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold">
                Atividades desenvolvidas
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Somente dias com marcação de ponto ficam disponíveis para preenchimento.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <RelatorioExportacaoButton
                href={`/api/acompanhamento-estagio/pdf?${queryExportacao}`}
                modo="auto"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-[var(--muted)]"
              >
                PDF
              </RelatorioExportacaoButton>
              <RelatorioExportacaoButton
                href={`/api/acompanhamento-estagio/excel?${queryExportacao}`}
                modo="auto"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-[var(--muted)]"
              >
                Excel
              </RelatorioExportacaoButton>
            </div>
          </div>

          {possuiLinhas ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead className="bg-[var(--muted)] text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-32 px-4 py-3 font-semibold">Data</th>
                    <th className="w-40 px-4 py-3 font-semibold">Marcações</th>
                    <th className="w-24 px-4 py-3 font-semibold">Horas</th>
                    <th className="min-w-[340px] px-4 py-3 font-semibold">
                      Atividades desenvolvidas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dados.linhas.map((linha) => (
                    <tr key={linha.dataIso} className="border-t align-top">
                      <td className="border-t px-4 py-3 font-medium">
                        {linha.dataLabel}
                      </td>
                      <td className="border-t px-4 py-3 text-muted-foreground">
                        {linha.marcacoes.join(" / ")}
                      </td>
                      <td className="border-t px-4 py-3 font-mono">
                        {linha.horasLabel}
                      </td>
                      <td className="border-t px-4 py-3">
                        <textarea
                          name={`atividade:${linha.dataIso}`}
                          defaultValue={linha.atividades}
                          disabled={!linha.editavel}
                          rows={3}
                          maxLength={2000}
                          className="min-h-20 w-full resize-y rounded-md border bg-[var(--card)] px-3 py-2 text-sm leading-5 disabled:bg-[var(--muted)] disabled:text-muted-foreground"
                        />
                        {linha.futuro ? (
                          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                            Data futura bloqueada.
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Não há marcações nesta competência.
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3 rounded-md border bg-[var(--card)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            {estadoSalvar.erro ? (
              <p className="font-semibold text-red-700 dark:text-red-300">
                {estadoSalvar.erro}
              </p>
            ) : estadoSalvar.sucesso ? (
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                {estadoSalvar.sucesso}
              </p>
            ) : dados.acompanhamento.assinaturaSupervisor ? (
              <p className="text-muted-foreground">
                Assinado pelo supervisor{" "}
                {dados.acompanhamento.assinaturaSupervisor.nome}.
              </p>
            ) : dados.acompanhamento.assinatura ? (
              <p className="text-muted-foreground">
                Assinado pelo estagiário {dados.acompanhamento.assinatura.nome}.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              type="submit"
              disabled={
                !modoEstagiario || fechado || aguardandoSupervisor || !possuiLinhas
              }
              loading={salvando}
              leftIcon={<Save className="size-4" aria-hidden="true" />}
            >
              Salvar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!podeFechar}
              leftIcon={<LockKeyhole className="size-4" aria-hidden="true" />}
              onClick={() => setModalFechamentoAberto(true)}
            >
              Assinar e enviar
            </Button>
            {podeSupervisorAssinar ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalDevolucaoAberto(true)}
                >
                  Devolver
                </Button>
                <Button
                  type="button"
                  leftIcon={<LockKeyhole className="size-4" aria-hidden="true" />}
                  onClick={() => setModalAssinaturaSupervisorAberto(true)}
                >
                  Assinar supervisor
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </form>

      <Modal
        open={modalFechamentoAberto}
        onOpenChange={setModalFechamentoAberto}
        title="Fechamento da competência"
        description={`Assine e envie ao supervisor o acompanhamento mensal de estágio da competência ${dados.competencia.label}.`}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalFechamentoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              loading={fechando}
              leftIcon={<LockKeyhole className="size-4" aria-hidden="true" />}
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
          </>
        }
      >
        <form action={fecharAction} className="space-y-4">
          <input type="hidden" name="competencia" value={dados.competencia.input} />
          <input type="hidden" name="anoReferencia" value={dados.competencia.ano} />
          <input type="hidden" name="mesReferencia" value={dados.competencia.mes} />

          <div>
            <label
              htmlFor="senhaAssinaturaAcompanhamentoEstagio"
              className="text-sm font-semibold"
            >
              Senha
            </label>
            <input
              id="senhaAssinaturaAcompanhamentoEstagio"
              name="senhaAssinatura"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />
          </div>

          {estadoFechar.erro ? (
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {estadoFechar.erro}
            </p>
          ) : null}
          {estadoFechar.sucesso ? (
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {estadoFechar.sucesso}
            </p>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={modalAssinaturaSupervisorAberto}
        onOpenChange={setModalAssinaturaSupervisorAberto}
        title="Assinatura do supervisor"
        description={`Assine eletronicamente o acompanhamento de ${dados.servidor.nome} na competência ${dados.competencia.label}.`}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalAssinaturaSupervisorAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              loading={assinandoSupervisor}
              leftIcon={<LockKeyhole className="size-4" aria-hidden="true" />}
              onClick={(event) => {
                const modal = event.currentTarget.closest('[role="dialog"]');
                const form = modal?.querySelector("form");
                if (form instanceof HTMLFormElement) {
                  form.requestSubmit();
                }
              }}
            >
              Assinar
            </Button>
          </>
        }
      >
        <form action={assinarSupervisorAction} className="space-y-4">
          <input type="hidden" name="servidorId" value={dados.servidor.id} />
          <input type="hidden" name="competencia" value={dados.competencia.input} />
          <input type="hidden" name="anoReferencia" value={dados.competencia.ano} />
          <input type="hidden" name="mesReferencia" value={dados.competencia.mes} />

          <div>
            <label
              htmlFor="senhaAssinaturaSupervisorAcompanhamentoEstagio"
              className="text-sm font-semibold"
            >
              Senha
            </label>
            <input
              id="senhaAssinaturaSupervisorAcompanhamentoEstagio"
              name="senhaAssinaturaSupervisor"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />
          </div>

          {estadoAssinarSupervisor.erro ? (
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {estadoAssinarSupervisor.erro}
            </p>
          ) : null}
          {estadoAssinarSupervisor.sucesso ? (
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {estadoAssinarSupervisor.sucesso}
            </p>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={modalDevolucaoAberto}
        onOpenChange={setModalDevolucaoAberto}
        title="Devolver para ajustes"
        description={`Informe o motivo da devolução do acompanhamento de ${dados.servidor.nome}.`}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalDevolucaoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              loading={devolvendoSupervisor}
              onClick={(event) => {
                const modal = event.currentTarget.closest('[role="dialog"]');
                const form = modal?.querySelector("form");
                if (form instanceof HTMLFormElement) {
                  form.requestSubmit();
                }
              }}
            >
              Devolver
            </Button>
          </>
        }
      >
        <form action={devolverSupervisorAction} className="space-y-4">
          <input type="hidden" name="servidorId" value={dados.servidor.id} />
          <input type="hidden" name="competencia" value={dados.competencia.input} />
          <input type="hidden" name="anoReferencia" value={dados.competencia.ano} />
          <input type="hidden" name="mesReferencia" value={dados.competencia.mes} />

          <div>
            <label
              htmlFor="justificativaDevolucaoAcompanhamentoEstagio"
              className="text-sm font-semibold"
            >
              Justificativa
            </label>
            <textarea
              id="justificativaDevolucaoAcompanhamentoEstagio"
              name="justificativaDevolucao"
              required
              rows={4}
              maxLength={2000}
              className="mt-2 min-h-28 w-full resize-y rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
            />
          </div>

          {estadoDevolverSupervisor.erro ? (
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {estadoDevolverSupervisor.erro}
            </p>
          ) : null}
          {estadoDevolverSupervisor.sucesso ? (
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {estadoDevolverSupervisor.sucesso}
            </p>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}

function CampoInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 min-h-10 rounded-md border bg-[var(--muted)] px-3 py-2 text-sm font-medium">
        {value || "-"}
      </dd>
    </div>
  );
}

function CompetenciasAnterioresGrid({
  competencias,
}: {
  competencias: DadosAcompanhamentoEstagio["competenciasAnteriores"];
}) {
  return (
    <section className="overflow-hidden rounded-md border bg-[var(--card)]">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">CompetÃªncias passadas</h2>
      </div>
      {competencias.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">CompetÃªncia</th>
                <th className="px-4 py-3 font-semibold">
                  Assinatura do estagiÃ¡rio
                </th>
                <th className="px-4 py-3 font-semibold">
                  Assinatura do supervisor
                </th>
                <th className="px-4 py-3 font-semibold">Supervisor</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {competencias.map((competencia) => (
                <tr key={competencia.id}>
                  <td className="border-t px-4 py-3 font-mono">
                    {competencia.competencia}
                  </td>
                  <td className="border-t px-4 py-3">
                    {formatarDataHora(competencia.assinadoEstagiarioEm)}
                  </td>
                  <td className="border-t px-4 py-3">
                    {formatarDataHora(competencia.assinadoSupervisorEm)}
                  </td>
                  <td className="border-t px-4 py-3">
                    {competencia.supervisorAssinante ?? "-"}
                  </td>
                  <td className="border-t px-4 py-3">{competencia.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma competÃªncia passada encontrada.
        </div>
      )}
    </section>
  );
}

function formatarDataHora(valor: string | null) {
  if (!valor) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Manaus",
  }).format(new Date(valor));
}

function CampoEditavel({
  label,
  name,
  value,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  disabled: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={`campo-${name}`}
        className="text-xs font-semibold uppercase text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={`campo-${name}`}
        name={name}
        defaultValue={value}
        disabled={disabled}
        className="mt-1 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm disabled:bg-[var(--muted)]"
      />
    </div>
  );
}
