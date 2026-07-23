"use client";

import { useActionState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import {
  diasSemana,
  tiposEscala,
  type EscalaFormState,
} from "../../application/schemas/escala.schema";

type EscalaFormProps = {
  action: (
    state: EscalaFormState,
    formData: FormData,
  ) => Promise<EscalaFormState>;
  valoresPadrao?: {
    horarioEntradaPadrao?: string | null;
    horarioSaidaPadrao?: string | null;
    cargaDiariaMinutos: number;
    exigeIntervalo: boolean;
    intervaloMinimoMinutos?: number | null;
  };
};

const estadoInicial: EscalaFormState = {
  sucesso: false,
  mensagem: null,
};

const rotulosTipo: Record<string, string> = {
  SEMANAL: "Semanal",
  REVEZAMENTO: "Revezamento",
  INDIVIDUAL: "Individual",
  CICLICA: "Ciclica",
  PLANEJADA: "Planejada",
  TURNO_FIXO: "Turno fixo",
  TURNO_ALTERNANTE: "Turno alternante",
};

const rotulosDia: Record<string, string> = {
  DOMINGO: "Domingo",
  SEGUNDA: "Segunda",
  TERCA: "Terça",
  QUARTA: "Quarta",
  QUINTA: "Quinta",
  SEXTA: "Sexta",
  SABADO: "Sábado",
};

function erro(estado: EscalaFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

function diaTrabalhadoPadrao(diaSemana: string) {
  return diaSemana !== "DOMINGO" && diaSemana !== "SABADO";
}

function obterValorDia(
  estado: EscalaFormState,
  chave: string,
  campo: string,
  valorPadrao: string | number | boolean,
) {
  const dia = estado.campos?.dias?.find(
    (item) => item.diaSemana === chave || String(item.posicaoCiclo) === chave,
  );

  if (!dia || !(campo in dia)) return valorPadrao;

  return dia[campo as keyof typeof dia] ?? valorPadrao;
}

const posicoesCiclo = Array.from({ length: 31 }, (_, indice) => indice + 1);

function errosDetalhados(estado: EscalaFormState) {
  return Object.entries(estado.erros ?? {}).filter(
    ([campo]) => campo.startsWith("dias.") && campo !== "dias",
  );
}

export function EscalaForm({ action, valoresPadrao }: EscalaFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const cargaPadrao = valoresPadrao?.cargaDiariaMinutos ?? 420;
  const entradaPadrao = valoresPadrao?.horarioEntradaPadrao ?? "08:00";
  const saidaPadrao = valoresPadrao?.horarioSaidaPadrao ?? "15:00";
  const intervaloMinimo = valoresPadrao?.intervaloMinimoMinutos ?? 60;

  return (
    <form
      action={formAction}
      className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm"
    >
      <div className="flex items-center gap-2 border-b p-5">
        <CalendarPlus className="size-5 text-blue-900 dark:text-blue-300" />
        <h2 className="text-lg font-bold">Cadastrar escala</h2>
      </div>

      <div className="space-y-5 p-5">
        {estado.mensagem && (
          <div
            role="alert"
            className={`rounded-lg border p-3 text-sm ${
              estado.sucesso
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {estado.mensagem}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="codigo" className="text-sm font-semibold">
              Código
            </label>
            <input
              id="codigo"
              name="codigo"
              defaultValue={estado.campos?.codigo ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm uppercase outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              placeholder="ESCALA_SEMANAL"
              required
            />
            {erro(estado, "codigo") && (
              <p className="text-sm text-red-600">{erro(estado, "codigo")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="nome" className="text-sm font-semibold">
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              defaultValue={estado.campos?.nome ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            {erro(estado, "nome") && (
              <p className="text-sm text-red-600">{erro(estado, "nome")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="tipo" className="text-sm font-semibold">
              Tipo
            </label>
            <select
              id="tipo"
              name="tipo"
              defaultValue={estado.campos?.tipo ?? "SEMANAL"}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            >
              {tiposEscala.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {rotulosTipo[tipo]}
                </option>
              ))}
            </select>
            {erro(estado, "tipo") && (
              <p className="text-sm text-red-600">{erro(estado, "tipo")}</p>
            )}
          </div>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <input
              type="checkbox"
              name="ativo"
              defaultChecked={estado.campos?.ativo ?? true}
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">Escala ativa</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Escalas inativas não aparecem para novas atribuições.
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <label htmlFor="quantidadeDiasCiclo" className="text-sm font-semibold">
              Dias do ciclo
            </label>
            <input
              id="quantidadeDiasCiclo"
              name="quantidadeDiasCiclo"
              type="number"
              min={1}
              max={31}
              defaultValue={estado.campos?.quantidadeDiasCiclo ?? 2}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            {erro(estado, "quantidadeDiasCiclo") && (
              <p className="text-sm text-red-600">
                {erro(estado, "quantidadeDiasCiclo")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="dataAncoragem" className="text-sm font-semibold">
              Data de ancoragem
            </label>
            <input
              id="dataAncoragem"
              name="dataAncoragem"
              type="date"
              defaultValue={estado.campos?.dataAncoragem ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            {erro(estado, "dataAncoragem") && (
              <p className="text-sm text-red-600">
                {erro(estado, "dataAncoragem")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="timezone" className="text-sm font-semibold">
              Fuso horario
            </label>
            <input
              id="timezone"
              name="timezone"
              defaultValue={estado.campos?.timezone ?? "America/Manaus"}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="descricao" className="text-sm font-semibold">
              Descrição
            </label>
            <textarea
              id="descricao"
              name="descricao"
              defaultValue={estado.campos?.descricao ?? ""}
              rows={3}
              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold">Ciclo por posicao</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-3">Posicao</th>
                  <th className="px-3 py-3">Trabalha</th>
                  <th className="px-3 py-3">Entrada</th>
                  <th className="px-3 py-3">Saida</th>
                  <th className="px-3 py-3">Inicio intervalo</th>
                  <th className="px-3 py-3">Fim intervalo</th>
                  <th className="px-3 py-3">Carga min.</th>
                  <th className="px-3 py-3">Vira dia</th>
                </tr>
              </thead>
              <tbody>
                {posicoesCiclo.map((posicao) => {
                  const chave = String(posicao);
                  const prefixo = `dias.${chave}`;
                  const trabalhaPadrao = posicao % 2 === 1;

                  return (
                    <tr key={posicao} className="border-b last:border-b-0">
                      <td className="px-3 py-3 font-semibold">Dia {posicao}</td>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          name={`${prefixo}.trabalha`}
                          defaultChecked={Boolean(
                            obterValorDia(
                              estado,
                              chave,
                              "trabalha",
                              trabalhaPadrao && posicao <= 2,
                            ),
                          )}
                          className="size-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="time"
                          name={`${prefixo}.horarioEntrada`}
                          defaultValue={String(
                            obterValorDia(
                              estado,
                              chave,
                              "horarioEntrada",
                              trabalhaPadrao && posicao <= 2 ? entradaPadrao : "",
                            ),
                          )}
                          className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="time"
                          name={`${prefixo}.horarioSaida`}
                          defaultValue={String(
                            obterValorDia(
                              estado,
                              chave,
                              "horarioSaida",
                              trabalhaPadrao && posicao <= 2 ? saidaPadrao : "",
                            ),
                          )}
                          className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="time"
                          name={`${prefixo}.intervaloInicio`}
                          defaultValue={String(
                            obterValorDia(
                              estado,
                              chave,
                              "intervaloInicio",
                              valoresPadrao?.exigeIntervalo &&
                                trabalhaPadrao &&
                                posicao <= 2
                                ? "12:00"
                                : "",
                            ),
                          )}
                          className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="time"
                          name={`${prefixo}.intervaloFim`}
                          defaultValue={String(
                            obterValorDia(
                              estado,
                              chave,
                              "intervaloFim",
                              valoresPadrao?.exigeIntervalo &&
                                trabalhaPadrao &&
                                posicao <= 2
                                ? `13:${String(intervaloMinimo % 60).padStart(2, "0")}`
                                : "",
                            ),
                          )}
                          className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={0}
                          max={720}
                          name={`${prefixo}.cargaPrevistaMinutos`}
                          defaultValue={Number(
                            obterValorDia(
                              estado,
                              chave,
                              "cargaPrevistaMinutos",
                              trabalhaPadrao && posicao <= 2 ? cargaPadrao : 0,
                            ),
                          )}
                          className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          name={`${prefixo}.cruzaMeiaNoite`}
                          defaultChecked={Boolean(
                            obterValorDia(
                              estado,
                              chave,
                              "cruzaMeiaNoite",
                              false,
                            ),
                          )}
                          className="size-4 rounded border-slate-300"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-3 py-3">Dia</th>
                <th className="px-3 py-3">Trabalha</th>
                <th className="px-3 py-3">Entrada</th>
                <th className="px-3 py-3">Saída</th>
                <th className="px-3 py-3">Início intervalo</th>
                <th className="px-3 py-3">Fim intervalo</th>
                <th className="px-3 py-3">Carga min.</th>
              </tr>
            </thead>

            <tbody>
              {diasSemana.map((diaSemana) => {
                const prefixo = `dias.${diaSemana}`;
                const trabalhaPadrao = diaTrabalhadoPadrao(diaSemana);
                const trabalha = Boolean(
                  obterValorDia(estado, diaSemana, "trabalha", trabalhaPadrao),
                );

                return (
                  <tr key={diaSemana} className="border-b last:border-b-0">
                    <td className="px-3 py-3 font-semibold">
                      {rotulosDia[diaSemana]}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        name={`${prefixo}.trabalha`}
                        defaultChecked={trabalha}
                        className="size-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="time"
                        name={`${prefixo}.horarioEntrada`}
                        defaultValue={String(
                          obterValorDia(
                            estado,
                            diaSemana,
                            "horarioEntrada",
                            trabalhaPadrao ? entradaPadrao : "",
                          ),
                        )}
                        className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="time"
                        name={`${prefixo}.horarioSaida`}
                        defaultValue={String(
                          obterValorDia(
                            estado,
                            diaSemana,
                            "horarioSaida",
                            trabalhaPadrao ? saidaPadrao : "",
                          ),
                        )}
                        className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="time"
                        name={`${prefixo}.intervaloInicio`}
                        defaultValue={String(
                          obterValorDia(
                            estado,
                            diaSemana,
                            "intervaloInicio",
                            valoresPadrao?.exigeIntervalo && trabalhaPadrao
                              ? "12:00"
                              : "",
                          ),
                        )}
                        className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="time"
                        name={`${prefixo}.intervaloFim`}
                        defaultValue={String(
                          obterValorDia(
                            estado,
                            diaSemana,
                            "intervaloFim",
                            valoresPadrao?.exigeIntervalo && trabalhaPadrao
                              ? `13:${String(intervaloMinimo % 60).padStart(2, "0")}`
                              : "",
                          ),
                        )}
                        className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={0}
                        max={720}
                        name={`${prefixo}.cargaPrevistaMinutos`}
                        defaultValue={Number(
                          obterValorDia(
                            estado,
                            diaSemana,
                            "cargaPrevistaMinutos",
                            trabalhaPadrao ? cargaPadrao : 0,
                          ),
                        )}
                        className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(erro(estado, "dias") || errosDetalhados(estado).length > 0) && (
          <div className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {erro(estado, "dias") && <p>{erro(estado, "dias")}</p>}
            {errosDetalhados(estado).map(([campo, mensagens]) => (
              <p key={campo}>{mensagens[0]}</p>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pendente}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pendente ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarPlus className="size-4" />
            )}
            Cadastrar escala
          </button>
        </div>
      </div>
    </form>
  );
}
