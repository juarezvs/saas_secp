"use client";

import { useActionState, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { criarSolicitacaoAction } from "../../application/actions/criar-solicitacao.action";
import {
  tiposMarcacaoAjuste,
  tiposCompensacaoBancoHoras,
  tiposSolicitacao,
  type CriarSolicitacaoFormState,
} from "../../application/schemas/solicitacao.schema";
import { rotuloTipoSolicitacao } from "../../application/services/fluxo-solicitacao.service";

const estadoInicial: CriarSolicitacaoFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: CriarSolicitacaoFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function SolicitacaoForm() {
  const [estado, formAction, pendente] = useActionState(
    criarSolicitacaoAction,
    estadoInicial
  );

  const campos = estado.campos;
  const [tipoSelecionado, setTipoSelecionado] = useState<string>(
    campos?.tipo ?? "AJUSTE_PONTO",
  );
  const exigeAutorizacaoBancoHoras = [
    "COMPENSACAO",
    "HORA_CREDITO_PREVIA",
  ].includes(tipoSelecionado);

  return (
    <form action={formAction} className="space-y-6">
      {estado.mensagem && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {estado.mensagem}
        </div>
      )}

      <section className="rounded-xl border bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Dados da solicitação</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="tipo" className="text-sm font-semibold">
              Tipo
            </label>

            <select
              id="tipo"
              name="tipo"
              defaultValue={campos?.tipo ?? "AJUSTE_PONTO"}
              onChange={(event) => setTipoSelecionado(event.target.value)}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
              required
            >
              {tiposSolicitacao.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {rotuloTipoSolicitacao(tipo)}
                </option>
              ))}
            </select>

            {erro(estado, "tipo") && (
              <p className="text-sm text-red-600">{erro(estado, "tipo")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="dataReferencia" className="text-sm font-semibold">
              Data de referência
            </label>

            <input
              id="dataReferencia"
              name="dataReferencia"
              type="date"
              defaultValue={campos?.dataReferencia ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />

            {erro(estado, "dataReferencia") && (
              <p className="text-sm text-red-600">
                {erro(estado, "dataReferencia")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="tipoMarcacao" className="text-sm font-semibold">
              Tipo de marcação para ajuste
            </label>

            <select
              id="tipoMarcacao"
              name="tipoMarcacao"
              defaultValue={campos?.tipoMarcacao ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            >
              <option value="">Não se aplica</option>
              {tiposMarcacaoAjuste.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>

            {erro(estado, "tipoMarcacao") && (
              <p className="text-sm text-red-600">
                {erro(estado, "tipoMarcacao")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="horaAjuste" className="text-sm font-semibold">
              Hora solicitada
            </label>

            <input
              id="horaAjuste"
              name="horaAjuste"
              type="time"
              defaultValue={campos?.horaAjuste ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />

            {erro(estado, "horaAjuste") && (
              <p className="text-sm text-red-600">
                {erro(estado, "horaAjuste")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="dataInicio" className="text-sm font-semibold">
              Data/hora inicial
            </label>

            <input
              id="dataInicio"
              name="dataInicio"
              type="datetime-local"
              defaultValue={campos?.dataInicio ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />

            {erro(estado, "dataInicio") && (
              <p className="text-sm text-red-600">{erro(estado, "dataInicio")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="dataFim" className="text-sm font-semibold">
              Data/hora final
            </label>

            <input
              id="dataFim"
              name="dataFim"
              type="datetime-local"
              defaultValue={campos?.dataFim ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />

            {erro(estado, "dataFim") && (
              <p className="text-sm text-red-600">{erro(estado, "dataFim")}</p>
            )}
          </div>

          {exigeAutorizacaoBancoHoras && (
            <>
              {tipoSelecionado === "COMPENSACAO" && (
                <div className="space-y-2">
                  <label htmlFor="tipoCompensacao" className="text-sm font-semibold">
                    Modalidade da compensação
                  </label>
                  <select
                    id="tipoCompensacao"
                    name="tipoCompensacao"
                    defaultValue={campos?.tipoCompensacao ?? "UTILIZAR_CREDITO"}
                    className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                    required
                  >
                    {tiposCompensacaoBancoHoras.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo === "UTILIZAR_CREDITO"
                          ? "Utilizar crédito para compensar débito"
                          : "Trabalhar horas para compensar débito"}
                      </option>
                    ))}
                  </select>
                  {erro(estado, "tipoCompensacao") && (
                    <p className="text-sm text-red-600">
                      {erro(estado, "tipoCompensacao")}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="horasSolicitadas" className="text-sm font-semibold">
                  Quantidade de horas
                </label>
                <input
                  id="horasSolicitadas"
                  name="horasSolicitadas"
                  type="number"
                  min="0.25"
                  max="16"
                  step="0.25"
                  defaultValue={campos?.horasSolicitadas ?? ""}
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                  required
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  A chefia autorizará esta quantidade para o período informado.
                </p>
                {erro(estado, "horasSolicitadas") && (
                  <p className="text-sm text-red-600">
                    {erro(estado, "horasSolicitadas")}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="titulo" className="text-sm font-semibold">
              Título
            </label>

            <input
              id="titulo"
              name="titulo"
              defaultValue={campos?.titulo ?? ""}
              placeholder="Ex.: Ajuste de ponto de entrada"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
              required
            />

            {erro(estado, "titulo") && (
              <p className="text-sm text-red-600">{erro(estado, "titulo")}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="descricao" className="text-sm font-semibold">
              Justificativa / descrição
            </label>

            <textarea
              id="descricao"
              name="descricao"
              rows={5}
              defaultValue={campos?.descricao ?? ""}
              placeholder="Explique o ocorrido de forma objetiva."
              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
              required
            />

            {erro(estado, "descricao") && (
              <p className="text-sm text-red-600">
                {erro(estado, "descricao")}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          Enviar solicitação
        </button>
      </div>
    </form>
  );
}
