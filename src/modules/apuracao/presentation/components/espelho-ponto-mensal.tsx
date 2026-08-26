import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Laptop,
  PartyPopper,
  Wifi,
} from "lucide-react";

import { minutosParaTexto } from "../../application/services/calcular-tempo.service";
import { autorizarHoraExtraBancoHorasAction } from "../../application/actions/autorizar-hora-extra-banco-horas.action";
import { ConfirmarAutorizacaoHoraExtraButton } from "./confirmar-autorizacao-hora-extra-button";
import { TempoAutorizadoInput } from "./tempo-autorizado-input";
import {
  classificarDiaEspelho,
  conferenciaEspelho,
  resumirEspelhoMensal,
  rotuloSolicitacaoEspelho,
  type SolicitacaoAplicadaEspelho,
} from "../../application/services/classificar-espelho-mensal.service";
import {
  descricaoMarcacao,
  marcacaoPossuiAjuste,
} from "../../application/services/espelho-marcacao-origem.service";
import { AfastamentoTipoIcone } from "@/modules/servidores/presentation/components/afastamento-tipo-icone";

type ApuracaoMensalItem = {
  id: string;
  dataReferencia: Date | string;
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosIntervalo?: number;
  minutosCredito: number;
  minutosDebito: number;
  resultado: string;
  status: string;
  metadados?: unknown;
  contabilizarSaldos?: boolean;
  geradoParaCompetencia?: boolean;
  minutosDebitoApurado?: number;
  minutosDebitoCompensado?: number;
  minutosHoraExtraAutorizada?: number;
  minutosHoraExtraNaoAutorizada?: number;
  minutosBancoHoras?: number;
  ocorrencias?: {
    id?: string;
    tipo: string;
    descricao: string;
    minutos: number;
    detalhes?: unknown;
  }[];
};

type MarcacaoItem = {
  id: string;
  dataHora: Date | string;
  dataReferencia: Date | string;
  fusoHorario?: string | null;
  tipo: string;
  fonte?: string | null;
  status: string;
  metadados?: unknown;
};

type DiaInstitucionalEspelho = {
  tipo: string;
  descricao: string;
  contaComoDiaUtil: boolean;
  geraApuracaoRegular: boolean;
};

export function EspelhoPontoMensal({
  apuracoes,
  marcacoes,
  controles,
  acoesBancoHoras,
  destaque,
  modoCompactoPessoaExterna = false,
}: {
  apuracoes: ApuracaoMensalItem[];
  marcacoes: MarcacaoItem[];
  controles?: ReactNode;
  destaque?: {
    dataReferencia?: string | null;
    ocorrenciaId?: string | null;
  };
  modoCompactoPessoaExterna?: boolean;
  acoesBancoHoras?: {
    habilitadas: boolean;
    bancoHorasAtivo?: boolean;
    servidorId: string;
    anoReferencia: number;
    mesReferencia: number;
  };
}) {
  const marcacoesPorDia = agruparMarcacoesPorDia(marcacoes);
  const quantidadeColunasMarcacoes = calcularQuantidadeColunasMarcacoes(
    apuracoes,
    marcacoesPorDia,
  );
  const rotulosColunasMarcacoes = rotulosColunasTempo(
    quantidadeColunasMarcacoes,
  );

  const totais = apuracoes.reduce(
    (acc, item) => {
      acc.previsto += item.cargaPrevistaMinutos;

      if (item.contabilizarSaldos !== false) {
        acc.trabalhado += item.minutosTrabalhados;
        acc.credito += item.minutosCredito;
        acc.debito += item.minutosDebito;
        acc.horaExtraAutorizada += item.minutosHoraExtraAutorizada ?? 0;
        acc.horaExtraNaoAutorizada += item.minutosHoraExtraNaoAutorizada ?? 0;
        acc.bancoHoras += item.minutosBancoHoras ?? 0;
      }

      return acc;
    },
    {
      previsto: 0,
      trabalhado: 0,
      credito: 0,
      debito: 0,
      horaExtraAutorizada: 0,
      horaExtraNaoAutorizada: 0,
      bancoHoras: 0,
    },
  );
  const apuracoesContabilizadas = apuracoes.filter(
    (item) => item.contabilizarSaldos !== false,
  );
  const resumoFuncional = resumirEspelhoMensal(apuracoesContabilizadas);

  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold">Espelho mensal</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Consolidação preliminar das apurações diárias calculadas.
          </p>
        </div>

        {controles ? <div className="lg:ml-auto">{controles}</div> : null}
      </div>

      <div className="sticky top-[4.5rem] z-30 grid gap-4 border-b bg-[var(--card)]/95 p-5 shadow-sm backdrop-blur md:grid-cols-4 xl:grid-cols-10">
        <Resumo label="Previsto" value={minutosParaTexto(totais.previsto)} />
        <Resumo
          label="Trabalhado"
          value={minutosParaTexto(totais.trabalhado)}
        />
        <Resumo
          label="Crédito"
          value={minutosParaTexto(totais.credito)}
          destaque="credito"
        />
        <Resumo
          label="Débito"
          value={minutosParaTexto(totais.debito)}
          destaque="debito"
        />
        <Resumo
          label="Hora extra autorizada"
          value={minutosParaTexto(totais.horaExtraAutorizada)}
          destaque="credito"
        />
        <Resumo
          label="Hora extra não autorizada"
          value={minutosParaTexto(totais.horaExtraNaoAutorizada)}
          destaque={totais.horaExtraNaoAutorizada > 0 ? "debito" : undefined}
        />
        <Resumo
          label="Banco de horas"
          value={formatarSaldoBancoHoras(totais.bancoHoras)}
          destaque={
            totais.bancoHoras > 0
              ? "credito"
              : totais.bancoHoras < 0
                ? "debito"
                : undefined
          }
        />
        <Resumo
          label="Ausências"
          value={String(resumoFuncional.ausencias)}
          detalhe={minutosParaTexto(resumoFuncional.minutosAusencia)}
          destaque={resumoFuncional.ausencias > 0 ? "debito" : undefined}
        />
        <Resumo
          label="Ativ. externas"
          value={String(resumoFuncional.atividadesExternas)}
          detalhe={minutosParaTexto(resumoFuncional.minutosAtividadeExterna)}
          destaque={
            resumoFuncional.atividadesExternas > 0 ? "neutro" : undefined
          }
        />
        <Resumo
          label="Viagens"
          value={String(resumoFuncional.viagensServico)}
          detalhe={minutosParaTexto(resumoFuncional.minutosViagemServico)}
          destaque={resumoFuncional.viagensServico > 0 ? "neutro" : undefined}
        />
      </div>

      {modoCompactoPessoaExterna ? (
        <EspelhoPontoMensalCompacto
          apuracoes={apuracoes}
          marcacoes={marcacoes}
          destaque={destaque}
        />
      ) : (
        <div className="max-w-full overflow-x-clip">
          <table className="w-full min-w-[1580px] border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-[calc(4.5rem+51.5rem)] z-20 text-[11px] uppercase tracking-wide text-[var(--muted-foreground)] shadow-sm md:top-[calc(4.5rem+18.5rem)] xl:top-[calc(4.5rem+9.35rem)]">
              <tr className="bg-[var(--card)]">
                <th
                  className="w-14 rounded-tl-xl border-b border-r px-5 py-4 text-center align-middle font-bold"
                  rowSpan={2}
                >
                  Sit.
                </th>
                <th
                  className="border-b px-5 py-4 align-middle font-bold"
                  rowSpan={2}
                >
                  Data
                </th>
                <th
                  className="border-b px-2 py-3 text-center"
                  colSpan={quantidadeColunasMarcacoes}
                >
                  <span className="inline-flex rounded-full border bg-[var(--muted)] px-3 py-1 text-[10px] font-black tracking-wide text-foreground shadow-sm">
                    Marcações
                  </span>
                </th>
                <th
                  className="border-b border-l px-5 py-4 align-middle font-bold"
                  rowSpan={2}
                >
                  Apontamentos
                </th>
                <th
                  className="border-b border-l px-2 py-3 text-center"
                  colSpan={3}
                >
                  <span className="inline-flex rounded-full border bg-[var(--muted)] px-3 py-1 text-[10px] font-black tracking-wide text-foreground shadow-sm">
                    Jornada
                  </span>
                </th>
                <th
                  className="border-b border-l px-2 py-3 text-center"
                  colSpan={3}
                >
                  <span className="inline-flex rounded-full border bg-emerald-50 px-3 py-1 text-[10px] font-black tracking-wide text-emerald-800 shadow-sm dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                    Banco de Horas
                  </span>
                </th>
                <th
                  className="border-b border-l px-2 py-3 text-center"
                  colSpan={2}
                >
                  <span className="inline-flex rounded-full border bg-amber-50 px-3 py-1 text-[10px] font-black tracking-wide text-amber-800 shadow-sm dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    Horas Extras
                  </span>
                </th>
                {acoesBancoHoras?.habilitadas ? (
                  <th
                    className="rounded-tr-xl border-b border-l px-5 py-4 align-middle font-bold"
                    rowSpan={2}
                  >
                    Ações
                  </th>
                ) : null}
              </tr>
              <tr className="border-b bg-[var(--muted)]">
                {rotulosColunasMarcacoes.map((rotulo) => (
                  <th
                    key={rotulo}
                    className="border-b px-5 py-3 font-bold text-foreground"
                  >
                    {rotulo}
                  </th>
                ))}
                <th className="border-b border-l px-5 py-3 font-bold text-foreground">
                  Previsto
                </th>
                <th className="border-b px-5 py-3 font-bold text-foreground">
                  Intervalo
                </th>
                <th className="border-b px-5 py-3 font-bold text-foreground">
                  Trabalhado
                </th>
                <th className="border-b border-l px-5 py-3 font-bold text-emerald-700 dark:text-emerald-300">
                  Crédito
                </th>
                <th className="border-b px-5 py-3 font-bold text-red-700 dark:text-red-300">
                  Débito
                </th>
                <th className="border-b px-5 py-3 font-bold text-foreground">
                  Saldo
                </th>
                <th className="border-b border-l px-5 py-3 font-bold text-foreground">
                  Autorizada
                </th>
                <th className="border-b px-5 py-3 font-bold text-foreground">
                  Não autorizada
                </th>
              </tr>
            </thead>

            <tbody>
              {apuracoes.map((item) => {
                const chaveReferencia = chaveDataReferenciaUtc(
                  item.dataReferencia,
                );
                const marcacoesDoDia =
                  marcacoesPorDia.get(chaveReferencia) ?? [];
                const exigeIntervalo = extrairExigeIntervalo(item.metadados);
                const previsaoJornada = extrairPrevisaoJornadaDia(
                  item.metadados,
                );
                const horarios = distribuirMarcacoesNasColunas(
                  marcacoesDoDia,
                  exigeIntervalo,
                  quantidadeColunasMarcacoes,
                );
                const trabalhoRemoto = extrairTrabalhoRemoto(item.metadados);
                const classificacao = classificarDiaEspelho(item);
                const diaInstitucional = extrairDiaInstitucional(
                  item.metadados,
                );
                const dispensaPonto = classificacao.dispensaPonto;
                const solicitacoesAplicadas =
                  classificacao.solicitacoesAplicadas;
                const justificativaAusenciaMesclada =
                  encontrarJustificativaAusenciaMesclada(solicitacoesAplicadas);
                const conferencia = conferenciaEspelho(item.status, item);
                const possuiMarcacaoAjustada =
                  marcacoesDoDia.some(marcacaoPossuiAjuste);
                const possuiAfastamento = (item.ocorrencias ?? []).some(
                  (ocorrencia) => ocorrencia.tipo === "AFASTAMENTO",
                );
                const afastamentoPrincipal = encontrarAfastamentoPrincipal(
                  item.ocorrencias,
                );
                const resumoAfastamento =
                  afastamentoPrincipal && marcacoesDoDia.length === 0
                    ? resumirAfastamentoEspelho(
                        afastamentoPrincipal,
                        item.dataReferencia,
                      )
                    : null;
                const textoResumoHorario = textoResumoHorarioPrevisto(
                  previsaoJornada,
                  marcacoesDoDia.length,
                );
                const resumoMarcacoesMescladas =
                  !resumoAfastamento &&
                  !textoResumoHorario &&
                  marcacoesDoDia.length === 0
                    ? resumirMarcacoesMescladas({
                        diaInstitucional,
                        previsaoJornada,
                        solicitacao: justificativaAusenciaMesclada,
                      })
                    : null;
                const dicaSemaforo = montarDicaSemaforo({
                  item,
                  conferencia,
                  possuiMarcacaoAjustada,
                  solicitacoesAplicadas,
                });
                const mesclarMarcacoesOcorrencias = Boolean(
                  resumoMarcacoesMescladas,
                );
                const diaDestacado = itemEhDestaque(item, destaque);
                const idDia = `espelho-dia-${chaveReferencia}`;

                return (
                  <tr
                    key={item.id}
                    id={idDia}
                    className={classeLinhaEspelho(diaDestacado)}
                  >
                    <td className="px-5 py-4 text-center">
                      <IconeSemaforo
                        tom={conferencia.tom}
                        title={dicaSemaforo}
                        aria-label={dicaSemaforo}
                      />
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-medium">
                      {formatarDataReferenciaUtc(item.dataReferencia)}
                    </td>

                    {resumoAfastamento ? (
                      <td
                        colSpan={quantidadeColunasMarcacoes}
                        className="px-5 py-4"
                      >
                        <BadgeAfastamentoResumo resumo={resumoAfastamento} />
                      </td>
                    ) : textoResumoHorario ? (
                      Array.from({ length: quantidadeColunasMarcacoes }).map(
                        (_, indice) => (
                          <td
                            key={`${item.id}-resumo-horario-${indice}`}
                            className="px-5 py-4"
                          >
                            <span className="inline-flex rounded-full border border-slate-200 bg-[var(--muted)] px-3 py-1 text-xs font-bold text-[var(--muted-foreground)]">
                              {textoResumoHorario}
                            </span>
                          </td>
                        ),
                      )
                    ) : resumoMarcacoesMescladas ? (
                      <td
                        colSpan={quantidadeColunasMarcacoes}
                        className="px-5 py-4"
                      >
                        <BadgeResumoMarcacoesMescladas
                          resumo={resumoMarcacoesMescladas}
                        />
                      </td>
                    ) : (
                      horarios.map((horario, indice) => (
                        <td
                          key={`${item.id}-horario-${indice}`}
                          className="whitespace-nowrap px-5 py-4 font-mono"
                        >
                          {horario ? (
                            <span
                              className={`rounded-full border px-2 py-1 text-xs ${
                                horario.ajustada
                                  ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-[var(--muted)]"
                              }`}
                              title={horario.title}
                            >
                              {horario.valor}
                              {horario.ajustada ? "*" : ""}
                            </span>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">
                              -
                            </span>
                          )}
                        </td>
                      ))
                    )}

                    <td className="px-5 py-4">
                      {resumoAfastamento ? (
                        <BadgeAfastamentoTipo resumo={resumoAfastamento} />
                      ) : mesclarMarcacoesOcorrencias &&
                        previsaoJornada?.tipoDia === "HOME_OFFICE" ? (
                        <span
                          className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                          title="Dia previsto como home office em horário híbrido."
                        >
                          Híbrido
                        </span>
                      ) : mesclarMarcacoesOcorrencias &&
                        resumoMarcacoesMescladas &&
                        resumoMarcacoesMescladas.classe !== "neutro" ? (
                        <BadgeTipoMarcacoesMescladas
                          resumo={resumoMarcacoesMescladas}
                        />
                      ) : mesclarMarcacoesOcorrencias ? (
                        <span className="text-xs font-medium text-[var(--muted-foreground)]">
                          -
                        </span>
                      ) : dispensaPonto ? (
                        <span
                          className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                          title="Marcações preservadas internamente para rastreio, mas desconsideradas visualmente pela dispensa de ponto."
                        >
                          Dispensa de ponto
                        </span>
                      ) : trabalhoRemoto ? (
                        <span
                          className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                          title={trabalhoRemoto.descricao}
                        >
                          {trabalhoRemoto.regime === "TOTAL"
                            ? "Teletrabalho"
                            : "Trabalho remoto"}
                        </span>
                      ) : marcacoesDoDia.length > 0 ? (
                        <StatusResultado item={item} />
                      ) : diaInstitucional &&
                        !ehFimDeSemanaInstitucional(diaInstitucional) ? (
                        <BadgeDiaInstitucional dia={diaInstitucional} />
                      ) : possuiAfastamento ? null : (
                        <StatusResultado item={item} />
                      )}

                      {!resumoAfastamento && !mesclarMarcacoesOcorrencias && (
                        <div className={possuiAfastamento ? undefined : "mt-2"}>
                          <OcorrenciasDia
                            ocultarVazio
                            ocultarDispensaPonto={dispensaPonto}
                            dispensaPonto={classificacao.dispensaPonto}
                            diaInstitucional={diaInstitucional}
                            ocorrencias={item.ocorrencias ?? []}
                            solicitacoes={solicitacoesAplicadas}
                            destaqueOcorrenciaId={destaque?.ocorrenciaId}
                          />
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {minutosParaTexto(item.cargaPrevistaMinutos)}
                    </td>

                    <td className="px-5 py-4">
                      {minutosParaTexto(item.minutosIntervalo ?? 0)}
                    </td>

                    <td className="px-5 py-4">
                      {minutosParaTexto(item.minutosTrabalhados)}
                    </td>

                    <td className="px-5 py-4">
                      <ValorTempo
                        tipo="credito"
                        minutos={item.minutosCredito}
                        estado={
                          (item.minutosHoraExtraNaoAutorizada ?? 0) > 0
                            ? "pendente"
                            : (item.minutosBancoHoras ?? 0) > 0
                              ? "validado"
                              : undefined
                        }
                        detalhe={
                          (item.minutosHoraExtraNaoAutorizada ?? 0) > 0
                            ? "Crédito apurado aguardando autorização da chefia para entrar no banco de horas."
                            : (item.minutosBancoHoras ?? 0) > 0
                              ? "Crédito computado no banco de horas."
                              : undefined
                        }
                      />
                    </td>

                    <td className="px-5 py-4">
                      <ValorTempo
                        tipo="debito"
                        minutos={item.minutosDebito}
                        detalhe={
                          item.minutosDebitoCompensado &&
                          item.minutosDebitoCompensado > 0
                            ? `Apurado: ${minutosParaTexto(
                                item.minutosDebitoApurado ?? item.minutosDebito,
                              )}. Compensado: ${minutosParaTexto(
                                item.minutosDebitoCompensado,
                              )}.`
                            : undefined
                        }
                      />
                    </td>

                    <td className="px-5 py-4">
                      <ValorSaldoBancoHoras
                        minutos={item.minutosBancoHoras ?? 0}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <ValorTempo
                        tipo="credito"
                        minutos={item.minutosHoraExtraAutorizada ?? 0}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <ValorTempo
                        tipo="debito"
                        minutos={item.minutosHoraExtraNaoAutorizada ?? 0}
                        detalhe={
                          (item.minutosHoraExtraNaoAutorizada ?? 0) > 0
                            ? "Horas excedentes sem autorização prévia. Não entram no banco de horas até autorização da chefia."
                            : undefined
                        }
                      />
                    </td>

                    {acoesBancoHoras?.habilitadas &&
                    acoesBancoHoras.bancoHorasAtivo !== false ? (
                      <td className="px-5 py-4">
                        <AcoesBancoHorasDia
                          servidorId={acoesBancoHoras.servidorId}
                          anoReferencia={acoesBancoHoras.anoReferencia}
                          mesReferencia={acoesBancoHoras.mesReferencia}
                          dataReferencia={item.dataReferencia}
                          minutosNaoAutorizados={
                            item.minutosHoraExtraNaoAutorizada ?? 0
                          }
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })}

              {apuracoes.length === 0 && (
                <tr>
                  <td
                    colSpan={acoesBancoHoras?.habilitadas ? 16 : 15}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhuma apuração calculada para o mês.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function itemEhDestaque(
  item: ApuracaoMensalItem,
  destaque?: {
    dataReferencia?: string | null;
    ocorrenciaId?: string | null;
  },
) {
  if (!destaque?.dataReferencia && !destaque?.ocorrenciaId) {
    return false;
  }

  const mesmaData =
    destaque.dataReferencia === chaveDataReferenciaUtc(item.dataReferencia);
  const mesmaOcorrencia = Boolean(
    destaque.ocorrenciaId &&
    (item.ocorrencias ?? []).some(
      (ocorrencia) => ocorrencia.id === destaque.ocorrenciaId,
    ),
  );

  return mesmaData || mesmaOcorrencia;
}

function classeLinhaEspelho(destacada: boolean) {
  return [
    "scroll-mt-56 border-b last:border-b-0",
    destacada
      ? "bg-amber-50/90 outline outline-2 outline-amber-300 dark:bg-amber-950/30 dark:outline-amber-700"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function EspelhoPontoMensalCompacto({
  apuracoes,
  marcacoes,
  destaque,
}: {
  apuracoes: ApuracaoMensalItem[];
  marcacoes: MarcacaoItem[];
  destaque?: {
    dataReferencia?: string | null;
    ocorrenciaId?: string | null;
  };
}) {
  const marcacoesPorDia = agruparMarcacoesPorDia(marcacoes);

  return (
    <div className="max-w-full overflow-x-clip">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="sticky top-[calc(4.5rem+51.5rem)] z-20 border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)] shadow-sm md:top-[calc(4.5rem+18.5rem)] xl:top-[calc(4.5rem+9.35rem)]">
          <tr>
            <th className="px-5 py-3">DIA</th>
            <th className="px-5 py-3">1ª ENTRADA</th>
            <th className="px-5 py-3">1ª SAÍDA</th>
            <th className="px-5 py-3">2ª ENTRADA</th>
            <th className="px-5 py-3">2ª SAÍDA</th>
            <th className="px-5 py-3">HORAS NORMAIS</th>
            <th className="px-5 py-3">HORAS ALMOÇO</th>
            <th className="px-5 py-3">HORAS TRAB.</th>
            <th className="px-5 py-3">STATUS</th>
          </tr>
        </thead>

        <tbody>
          {apuracoes.map((item) => {
            const chaveReferencia = chaveDataReferenciaUtc(item.dataReferencia);
            const marcacoesDoDia = marcacoesPorDia.get(chaveReferencia) ?? [];
            const exigeIntervalo = extrairExigeIntervalo(item.metadados);
            const horarios = distribuirMarcacoesNasColunas(
              marcacoesDoDia,
              exigeIntervalo,
            );
            const diaDestacado = itemEhDestaque(item, destaque);
            const idDia = `espelho-dia-${chaveReferencia}`;

            return (
              <tr
                key={item.id}
                id={idDia}
                className={classeLinhaEspelho(diaDestacado)}
              >
                <td className="whitespace-nowrap px-5 py-4 font-medium">
                  {formatarDataReferenciaUtc(item.dataReferencia)}
                </td>

                {horarios.map((horario, indice) => (
                  <td
                    key={`${item.id}-horario-compacto-${indice}`}
                    className="whitespace-nowrap px-5 py-4 font-mono"
                  >
                    {horario ? (
                      <span
                        className={`rounded-full border px-2 py-1 text-xs ${
                          horario.ajustada
                            ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-[var(--muted)]"
                        }`}
                        title={horario.title}
                      >
                        {horario.valor}
                        {horario.ajustada ? "*" : ""}
                      </span>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">-</span>
                    )}
                  </td>
                ))}

                <td className="px-5 py-4">
                  {minutosParaTexto(item.cargaPrevistaMinutos)}
                </td>
                <td className="px-5 py-4">
                  {minutosParaTexto(item.minutosIntervalo ?? 0)}
                </td>
                <td className="px-5 py-4">
                  {minutosParaTexto(item.minutosTrabalhados)}
                </td>
                <td className="px-5 py-4">
                  <StatusResultado item={item} />
                </td>
              </tr>
            );
          })}

          {apuracoes.length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="px-5 py-10 text-center text-[var(--muted-foreground)]"
              >
                Nenhuma apuração calculada para o mês.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function OcorrenciasDia({
  ocultarVazio = false,
  ocultarDispensaPonto = false,
  dispensaPonto,
  diaInstitucional,
  ocorrencias,
  solicitacoes,
  destaqueOcorrenciaId,
}: {
  ocultarVazio?: boolean;
  ocultarDispensaPonto?: boolean;
  dispensaPonto: boolean;
  diaInstitucional: DiaInstitucionalEspelho | null;
  ocorrencias: ApuracaoMensalItem["ocorrencias"];
  solicitacoes: SolicitacaoAplicadaEspelho[];
  destaqueOcorrenciaId?: string | null;
}) {
  const itens = [
    ...(diaInstitucional && !ehFimDeSemanaInstitucional(diaInstitucional)
      ? [
          {
            chave: `dia-institucional-${diaInstitucional.tipo}`,
            label: rotuloDiaInstitucional(diaInstitucional),
            iconeLazer: ehDiaInstitucionalLazer(diaInstitucional),
            classe: diaInstitucional.geraApuracaoRegular
              ? ("alerta" as const)
              : ("neutro" as const),
            title: diaInstitucional.descricao,
          },
        ]
      : []),
    ...(dispensaPonto && !ocultarDispensaPonto
      ? [
          {
            chave: "dispensa-ponto",
            label: "Dispensa de ponto",
            classe: "ok" as const,
            title: "Servidor dispensado do registro de ponto.",
          },
        ]
      : []),
    ...(ocorrencias ?? [])
      .filter(
        (ocorrencia) =>
          ![
            "FALTA",
            "DEBITO",
            "CREDITO",
            "MARCACAO_INCOMPLETA",
            "HORA_NAO_AUTORIZADA",
          ].includes(ocorrencia.tipo) &&
          !(
            diaInstitucional &&
            ["SEM_EXPEDIENTE", diaInstitucional.tipo].includes(ocorrencia.tipo)
          ),
      )
      .map((ocorrencia, index) => ({
        chave: ocorrencia.id
          ? `ocorrencia-${ocorrencia.id}`
          : `ocorrencia-${index}-${ocorrencia.tipo}`,
        label: rotuloOcorrenciaEspelho(ocorrencia),
        destaque: Boolean(
          destaqueOcorrenciaId && ocorrencia.id === destaqueOcorrenciaId,
        ),
        classe:
          ocorrencia.tipo === "CREDITO"
            ? ("ok" as const)
            : classeAfastamentoEspelho(ocorrencia),
        descricaoAfastamento:
          ocorrencia.tipo === "AFASTAMENTO"
            ? rotuloOcorrenciaEspelho(ocorrencia)
            : null,
        title: formatarDescricaoOcorrenciaHint(
          ocorrencia.descricao,
          ocorrencia.minutos,
        ),
      })),
    ...solicitacoes
      .filter(
        (solicitacao) =>
          ["ATIVIDADE_EXTERNA", "VIAGEM_SERVICO", "COMPENSACAO"].includes(
            solicitacao.tipo,
          ) ||
          (solicitacao.tipo === "DISPENSA_PONTO" && !dispensaPonto),
      )
      .map((solicitacao) => ({
        chave: solicitacao.id,
        label: rotuloSolicitacaoEspelho(solicitacao.tipo),
        classe: "ok" as const,
        title: solicitacao.titulo,
      })),
  ];

  if (itens.length === 0) {
    if (ocultarVazio) {
      return null;
    }

    return <span className="text-[var(--muted-foreground)]">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {itens.map((item) => (
        <span
          key={item.chave}
          className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${
            "destaque" in item && item.destaque
              ? "border-amber-400 bg-amber-100 text-amber-950 ring-2 ring-amber-300 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-700"
              : item.classe === "erro"
                ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                : item.classe === "alerta"
                  ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                  : item.classe === "neutro"
                    ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
          title={item.title}
        >
          {"descricaoAfastamento" in item && item.descricaoAfastamento && (
            <AfastamentoTipoIcone
              descricao={item.descricaoAfastamento}
              className="mr-1 size-3.5"
            />
          )}
          {"iconeLazer" in item && item.iconeLazer && (
            <PartyPopper className="mr-1 size-3.5" aria-hidden="true" />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}

type ResumoAfastamentoEspelho = {
  tipo: "FERIAS" | "AFASTAMENTO";
  rotuloTipo: string;
  rotuloSituacao: string;
  rotuloCompleto: string;
  classe: "ok" | "alerta" | "erro" | "neutro";
  title?: string;
};

type ResumoMarcacoesMescladas = {
  rotuloStatus: string;
  rotuloDescricao: string;
  classe: "ok" | "alerta" | "erro" | "neutro";
  title?: string;
  iconeLazer?: boolean;
  iconeTrabalhoRemoto?: boolean;
};

function BadgeAfastamentoResumo({
  resumo,
}: {
  resumo: ResumoAfastamentoEspelho;
}) {
  return (
    <span
      className={`inline-flex rounded-md border px-3 py-2 text-sm font-semibold ${classesBadgeResumoAfastamento(
        resumo.classe,
      )}`}
      title={resumo.title}
    >
      <AfastamentoTipoIcone
        descricao={resumo.rotuloCompleto}
        className="mr-2 mt-0.5 size-4 shrink-0"
      />
      {resumo.rotuloCompleto}
    </span>
  );
}

function BadgeAfastamentoTipo({
  resumo,
}: {
  resumo: ResumoAfastamentoEspelho;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${classesBadgeResumoAfastamento(
        resumo.classe,
      )}`}
      title={resumo.rotuloCompleto}
    >
      {resumo.rotuloTipo}
    </span>
  );
}

function BadgeResumoMarcacoesMescladas({
  resumo,
}: {
  resumo: ResumoMarcacoesMescladas;
}) {
  return (
    <span
      className={`inline-flex rounded-md border px-3 py-2 text-sm font-semibold ${classesBadgeResumo(
        resumo.classe,
      )}`}
      title={resumo.title}
    >
      {resumo.iconeLazer && (
        <PartyPopper
          className="mr-2 mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
      )}
      {resumo.iconeTrabalhoRemoto && (
        <Laptop className="mr-2 mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      {resumo.rotuloDescricao}
      {resumo.iconeTrabalhoRemoto && (
        <Wifi className="ml-2 mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
    </span>
  );
}

function BadgeTipoMarcacoesMescladas({
  resumo,
}: {
  resumo: ResumoMarcacoesMescladas;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${classesBadgeResumo(
        resumo.classe,
      )}`}
      title={resumo.rotuloDescricao}
    >
      {resumo.rotuloStatus}
    </span>
  );
}

function BadgeDiaInstitucional({ dia }: { dia: DiaInstitucionalEspelho }) {
  return (
    <span
      className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
      title={dia.descricao}
    >
      {ehDiaInstitucionalLazer(dia) && (
        <PartyPopper className="mr-1 size-3.5" aria-hidden="true" />
      )}
      {rotuloDiaInstitucional(dia)}
    </span>
  );
}

function StatusResultado({ item }: { item: ApuracaoMensalItem }) {
  if (item.resultado === "INCOMPLETA") {
    return null;
  }

  const rotulo =
    item.cargaPrevistaMinutos === 0 &&
    item.minutosTrabalhados === 0 &&
    item.minutosCredito === 0 &&
    item.minutosDebito === 0
      ? "Folga"
      : ["CREDITO", "DEBITO"].includes(item.resultado)
        ? "Regular"
        : rotuloResultadoEspelho(item.resultado);
  const tipo =
    item.resultado === "REGULAR" ||
    item.resultado === "CREDITO" ||
    item.resultado === "DEBITO"
      ? "ok"
      : item.resultado === "INCOMPLETA"
        ? "alerta"
        : item.resultado === "FALTA"
          ? "erro"
          : "neutro";

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${
        tipo === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          : tipo === "alerta"
            ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
            : tipo === "erro"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
      }`}
    >
      {rotulo}
    </span>
  );
}

function encontrarJustificativaAusenciaMesclada(
  solicitacoes: SolicitacaoAplicadaEspelho[],
) {
  const tiposJustificamAusencia = new Set([
    "ABONO_JUSTIFICATIVA",
    "ATIVIDADE_EXTERNA",
    "VIAGEM_SERVICO",
    "CAPACITACAO",
    "COMPENSACAO",
    "FOLGA_BANCO_HORAS",
  ]);

  return (
    solicitacoes.find(
      (solicitacao) =>
        solicitacao.coberturaIntegral &&
        !solicitacao.trabalhoRemoto &&
        tiposJustificamAusencia.has(solicitacao.tipo),
    ) ?? null
  );
}

function formatarDescricaoOcorrenciaHint(
  descricao?: string | null,
  minutos?: number,
) {
  if (!descricao) {
    return undefined;
  }

  const texto = corrigirGrafiaHint(descricao)
    .replaceAll("Ausencia", "Ausência")
    .replaceAll("autorizacao", "autorização")
    .replaceAll("horario", "horário")
    .replaceAll("padrao", "padrão")
    .replaceAll("Há", "Há")
    .replaceAll("padrão", "padrão")
    .replaceAll("autorização", "autorização")
    .replaceAll("horário", "horário");

  if (!minutos || minutos < 60) {
    return texto;
  }

  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  const formatado = `${String(horas).padStart(2, "0")}:${String(
    minutosRestantes,
  ).padStart(2, "0")}`;

  return texto.replace(/\b\d+\s+minuto\(s\)/i, formatado);
}

function corrigirGrafiaHint(texto: string) {
  return texto
    .replaceAll("Conferencia", "Conferência")
    .replaceAll("Marcacoes", "Marcações")
    .replaceAll("marcacoes", "marcações")
    .replaceAll("Credito", "Crédito")
    .replaceAll("Debito", "Débito")
    .replaceAll("Ausencia", "Ausência")
    .replaceAll("Nao", "Não")
    .replaceAll(" nao ", " não ")
    .replaceAll("autorizacao", "autorização")
    .replaceAll("horario", "horário")
    .replaceAll("padrao", "padrão")
    .replaceAll("saida", "saída")
    .replaceAll("Saida", "Saída")
    .replaceAll("competencia", "competência")
    .replaceAll("Há", "Há")
    .replaceAll("padrão", "padrão")
    .replaceAll("autorização", "autorização")
    .replaceAll("horário", "horário")
    .replaceAll("Conferência", "Conferência")
    .replaceAll("não", "não")
    .replaceAll("saída", "saída")
    .replaceAll("Crédito", "Crédito")
    .replaceAll("Débito", "Débito");
}

function ehFimDeSemanaInstitucional(dia: DiaInstitucionalEspelho | null) {
  return dia?.tipo === "SABADO" || dia?.tipo === "DOMINGO";
}

function ehDiaInstitucionalLazer(dia: DiaInstitucionalEspelho | null) {
  return dia?.tipo === "FERIADO" || dia?.tipo === "PONTO_FACULTATIVO";
}

function extrairDiaInstitucional(
  metadados: unknown,
): DiaInstitucionalEspelho | null {
  if (!metadados || typeof metadados !== "object") {
    return null;
  }

  const dados = metadados as {
    tipoDiaInstitucional?: unknown;
    descricaoDiaInstitucional?: unknown;
    contaComoDiaUtil?: unknown;
    geraApuracaoRegular?: unknown;
  };

  if (
    typeof dados.tipoDiaInstitucional !== "string" ||
    dados.tipoDiaInstitucional === "UTIL"
  ) {
    return null;
  }

  return {
    tipo: dados.tipoDiaInstitucional,
    descricao:
      typeof dados.descricaoDiaInstitucional === "string" &&
      dados.descricaoDiaInstitucional.trim().length > 0
        ? dados.descricaoDiaInstitucional
        : rotuloTipoDiaInstitucional(dados.tipoDiaInstitucional),
    contaComoDiaUtil: dados.contaComoDiaUtil === true,
    geraApuracaoRegular: dados.geraApuracaoRegular === true,
  };
}

function rotuloResultadoEspelho(resultado: string) {
  const rotulos: Record<string, string> = {
    REGULAR: "Regular",
    CREDITO: "Crédito",
    DEBITO: "Débito",
    FALTA: "Falta",
    INCOMPLETA: "Marcações incompletas",
    SEM_JORNADA: "Sem jornada",
    SEM_EXPEDIENTE: "Sem expediente",
    PENDENTE: "Pendente",
  };

  return rotulos[resultado] ?? resultado.replaceAll("_", " ");
}

function rotuloOcorrenciaEspelho(ocorrencia: {
  tipo: string;
  descricao?: string | null;
  detalhes?: unknown;
}) {
  if (ocorrencia.tipo === "AFASTAMENTO") {
    return resumirAfastamentoEspelho(ocorrencia, null).rotuloCompleto;
  }

  const rotulos: Record<string, string> = {
    MARCACAO_INCOMPLETA: "Marcações incompletas",
    INTERVALO_INVALIDO: "Intervalo inválido",
    CREDITO: "Crédito",
    DEBITO: "Débito",
    FALTA: "Falta",
    SEM_JORNADA: "Sem jornada",
    HORA_NAO_AUTORIZADA: "Hora fora do expediente",
  };

  return rotulos[ocorrencia.tipo] ?? ocorrencia.tipo.replaceAll("_", " ");
}

function encontrarAfastamentoPrincipal(
  ocorrencias: ApuracaoMensalItem["ocorrencias"],
) {
  return (ocorrencias ?? []).find(
    (ocorrencia) => ocorrencia.tipo === "AFASTAMENTO",
  );
}

function resumirMarcacoesMescladas({
  diaInstitucional,
  previsaoJornada,
  solicitacao,
}: {
  diaInstitucional: DiaInstitucionalEspelho | null;
  previsaoJornada?: ReturnType<typeof extrairPrevisaoJornadaDia> | null;
  solicitacao: SolicitacaoAplicadaEspelho | null;
}): ResumoMarcacoesMescladas | null {
  if (diaInstitucional) {
    if (ehFimDeSemanaInstitucional(diaInstitucional)) {
      return {
        rotuloStatus: "Regular",
        rotuloDescricao: "Descanso previsto na jornada",
        classe: "neutro",
        title: diaInstitucional.descricao,
      };
    }

    if (diaInstitucional.tipo === "FERIADO") {
      return {
        rotuloStatus: "Regular",
        rotuloDescricao: rotuloDiaInstitucional(diaInstitucional),
        classe: "neutro",
        title: diaInstitucional.descricao,
        iconeLazer: true,
      };
    }

    if (diaInstitucional.tipo === "PONTO_FACULTATIVO") {
      return {
        rotuloStatus: "Regular",
        rotuloDescricao: rotuloDiaInstitucional(diaInstitucional),
        classe: "neutro",
        title: diaInstitucional.descricao,
        iconeLazer: true,
      };
    }

    return {
      rotuloStatus: "Regular",
      rotuloDescricao: rotuloDiaInstitucional(diaInstitucional),
      classe: diaInstitucional.geraApuracaoRegular ? "alerta" : "neutro",
      title: diaInstitucional.descricao,
      iconeLazer: ehDiaInstitucionalLazer(diaInstitucional),
    };
  }

  if (previsaoJornada?.tipoDia === "FOLGA") {
    return {
      rotuloStatus: "Regular",
      rotuloDescricao: "Descanso previsto na jornada",
      classe: "neutro",
      title: "Dia sem expediente por descanso previsto na jornada.",
    };
  }

  if (previsaoJornada?.tipoDia === "HOME_OFFICE") {
    return {
      rotuloStatus: "Regular",
      rotuloDescricao: "home office",
      classe: "neutro",
      title: "Dia previsto como home office no horário híbrido.",
      iconeTrabalhoRemoto: true,
    };
  }

  if (previsaoJornada?.tipoDia === "TELETRABALHO") {
    return {
      rotuloStatus: "Regular",
      rotuloDescricao: "teletrabalho",
      classe: "neutro",
      title: "Dia previsto como teletrabalho.",
      iconeTrabalhoRemoto: true,
    };
  }

  if (!solicitacao) {
    return null;
  }

  if (["COMPENSACAO", "FOLGA_BANCO_HORAS"].includes(solicitacao.tipo)) {
    return {
      rotuloStatus: "Regular",
      rotuloDescricao: "Folga por compensação",
      classe: "ok",
      title: solicitacao.titulo,
    };
  }

  if (solicitacao.tipo === "ABONO_JUSTIFICATIVA") {
    return {
      rotuloStatus: "Regular",
      rotuloDescricao: "Folga autorizada",
      classe: "ok",
      title: solicitacao.titulo,
    };
  }

  return {
    rotuloStatus: "Regular",
    rotuloDescricao: rotuloSolicitacaoEspelho(solicitacao.tipo),
    classe: "ok",
    title: solicitacao.titulo,
  };
}

function classeAfastamentoEspelho(ocorrencia: {
  tipo: string;
  descricao?: string | null;
  detalhes?: unknown;
}) {
  if (ocorrencia.tipo !== "AFASTAMENTO") {
    return "alerta" as const;
  }

  return resumirAfastamentoEspelho(ocorrencia, null).classe;
}

function resumirAfastamentoEspelho(
  ocorrencia: {
    tipo: string;
    descricao?: string | null;
    detalhes?: unknown;
  },
  dataReferencia: Date | string | null,
): ResumoAfastamentoEspelho {
  const detalhes = detalhesAfastamentoComoObjeto(ocorrencia.detalhes);
  const rotuloBase = rotuloAfastamentoEspelho(ocorrencia.descricao);
  const ehFerias =
    detalhes?.ehFerias === true ||
    textoContemFerias(rotuloBase) ||
    textoContemFerias(String(detalhes?.categoria ?? "")) ||
    textoContemFerias(String(detalhes?.tipoDescricao ?? ""));

  if (!ehFerias) {
    return {
      tipo: "AFASTAMENTO",
      rotuloTipo: "Afastamento",
      rotuloSituacao: rotuloBase,
      rotuloCompleto: rotuloBase,
      classe: "neutro",
      title: rotuloBase,
    };
  }

  const situacao = classificarSituacaoFeriasEspelho({
    detalhes,
    dataReferencia,
  });
  const rotuloCompleto =
    situacao.rotulo === "Em férias"
      ? situacao.rotulo
      : `Férias ${situacao.rotulo}`;

  return {
    tipo: "FERIAS",
    rotuloTipo: "Férias",
    rotuloSituacao: situacao.rotulo,
    rotuloCompleto,
    classe: situacao.classe,
    title: montarTitleFerias(detalhes, rotuloCompleto),
  };
}

function detalhesAfastamentoComoObjeto(valor: unknown) {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function textoNormalizado(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
}

function textoContemFerias(valor: string) {
  return textoNormalizado(valor).includes("FERIAS");
}

function dataReferenciaUtc(valor: Date | string | null | undefined) {
  if (!valor) {
    return null;
  }

  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
}

function hojeUtc() {
  const hoje = new Date();
  return Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
}

function classificarSituacaoFeriasEspelho({
  detalhes,
  dataReferencia,
}: {
  detalhes: Record<string, unknown> | null;
  dataReferencia: Date | string | null;
}) {
  const textoSituacao = textoNormalizado(
    [
      detalhes?.tipoCodigo,
      detalhes?.tipoDescricao,
      detalhes?.categoria,
      detalhes?.observacao,
      detalhes?.origemTabela,
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (textoSituacao.includes("CANCEL") || textoSituacao.includes("ANUL")) {
    return { rotulo: "canceladas", classe: "erro" as const };
  }

  if (
    textoSituacao.includes("INTERROMP") ||
    textoSituacao.includes("SUSPENS")
  ) {
    return { rotulo: "interrompidas", classe: "alerta" as const };
  }

  if (
    textoSituacao.includes("ADIAD") ||
    textoSituacao.includes("REMARC") ||
    textoSituacao.includes("ALTER")
  ) {
    return { rotulo: "adiadas", classe: "alerta" as const };
  }

  const referencia = dataReferenciaUtc(
    dataReferencia ?? (detalhes?.dataReferencia as string | null),
  );
  const inicio = dataReferenciaUtc(detalhes?.dataInicio as string | null);
  const fim = dataReferenciaUtc(detalhes?.dataFim as string | null);
  const hoje = hojeUtc();

  if (referencia !== null) {
    if (referencia > hoje) {
      return { rotulo: "programadas", classe: "neutro" as const };
    }

    if (
      referencia === hoje &&
      inicio !== null &&
      inicio <= hoje &&
      (fim === null || hoje <= fim)
    ) {
      return { rotulo: "Em férias", classe: "neutro" as const };
    }

    if (referencia < hoje) {
      return { rotulo: "gozadas", classe: "ok" as const };
    }
  }

  return { rotulo: "programadas", classe: "neutro" as const };
}

function montarTitleFerias(
  detalhes: Record<string, unknown> | null,
  rotulo: string,
) {
  const inicio = detalhes?.dataInicio
    ? formatarDataReferenciaUtc(String(detalhes.dataInicio))
    : null;
  const fim = detalhes?.dataFim
    ? formatarDataReferenciaUtc(String(detalhes.dataFim))
    : null;
  const periodo = inicio && fim ? ` (${inicio} a ${fim})` : "";

  return `${rotulo}${periodo}`;
}

function classesBadgeResumoAfastamento(
  classe: ResumoAfastamentoEspelho["classe"],
) {
  return classesBadgeResumo(classe);
}

function classesBadgeResumo(classe: "ok" | "alerta" | "erro" | "neutro") {
  if (classe === "erro") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300";
  }

  if (classe === "alerta") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300";
  }

  if (classe === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300";
  }

  return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300";
}

function rotuloAfastamentoEspelho(descricao?: string | null) {
  const texto = descricao?.trim();

  if (!texto) {
    return "Afastamento";
  }

  return texto
    .replace(/^Afastamento SARH:\s*/i, "")
    .replace(/\s*Processo\/SEI:.*$/i, "")
    .replace(/\.$/, "")
    .trim();
}

function rotuloTipoDiaInstitucional(tipo: string) {
  const rotulos: Record<string, string> = {
    SABADO: "Sábado",
    DOMINGO: "Domingo",
    FERIADO: "Feriado institucional",
    PONTO_FACULTATIVO: "Ponto facultativo",
    SUSPENSAO_EXPEDIENTE: "Suspensão de expediente",
    RECESSO_FORENSE: "Recesso forense",
  };

  return rotulos[tipo] ?? tipo.replaceAll("_", " ");
}

function formatarTextoEventoInstitucional(texto: string | null | undefined) {
  const normalizado = texto?.trim();

  if (!normalizado) return "";

  const minusculo = normalizado.toLocaleLowerCase("pt-BR");

  return `${minusculo.charAt(0).toLocaleUpperCase("pt-BR")}${minusculo.slice(1)}`;
}

function formatarDescricaoEventoInstitucional(
  texto: string | null | undefined,
) {
  return texto?.trim().toLocaleLowerCase("pt-BR") ?? "";
}

function rotuloDiaInstitucional(dia: DiaInstitucionalEspelho) {
  if (dia.tipo === "FERIADO" && dia.descricao !== "Feriado institucional") {
    return `Feriado: ${formatarDescricaoEventoInstitucional(dia.descricao)}`;
  }

  if (
    dia.tipo === "PONTO_FACULTATIVO" &&
    dia.descricao !== "Ponto facultativo"
  ) {
    return `Ponto facultativo: ${formatarDescricaoEventoInstitucional(dia.descricao)}`;
  }

  if (dia.tipo === "SUSPENSAO_EXPEDIENTE") {
    return dia.descricao && dia.descricao !== "Suspensão de expediente"
      ? `Suspensão: ${formatarDescricaoEventoInstitucional(dia.descricao)}`
      : "Suspensão de expediente";
  }

  if (dia.tipo === "RECESSO_FORENSE") {
    return formatarTextoEventoInstitucional(dia.descricao);
  }

  return rotuloTipoDiaInstitucional(dia.tipo);
}

function montarDicaSemaforo({
  item,
  conferencia,
  possuiMarcacaoAjustada,
  solicitacoesAplicadas,
}: {
  item: ApuracaoMensalItem;
  conferencia: ReturnType<typeof conferenciaEspelho>;
  possuiMarcacaoAjustada: boolean;
  solicitacoesAplicadas: SolicitacaoAplicadaEspelho[];
}) {
  const linhas = [
    `Resultado: ${rotuloResultadoEspelho(item.resultado)}`,
    `Conferência: ${conferencia.rotulo}`,
    conferencia.descricao,
  ];

  if (possuiMarcacaoAjustada) {
    linhas.push("Ajuste aplicado.");
  }

  for (const solicitacao of solicitacoesAplicadas) {
    const cobertura = solicitacao.coberturaIntegral
      ? "cobertura integral"
      : minutosParaTexto(solicitacao.minutosCobertos);
    const titulo = solicitacao.trabalhoRemoto
      ? "Trabalho remoto deferido"
      : `${rotuloSolicitacaoEspelho(solicitacao.tipo)}: ${solicitacao.titulo}`;

    linhas.push(`${titulo} (${cobertura}).`);
  }

  return linhas.filter(Boolean).map(corrigirGrafiaHint).join("\n");
}

function IconeSemaforo({
  tom,
  title,
  "aria-label": ariaLabel,
}: {
  tom: "ok" | "alerta" | "neutro";
  title: string;
  "aria-label": string;
}) {
  if (tom === "ok") {
    return (
      <span className="inline-flex" aria-label={ariaLabel} title={title}>
        <CheckCircle2
          className="size-5 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
      </span>
    );
  }

  if (tom === "alerta") {
    return (
      <span className="inline-flex" aria-label={ariaLabel} title={title}>
        <AlertTriangle
          className="size-5 text-red-600 dark:text-red-400"
          aria-hidden="true"
        />
      </span>
    );
  }

  return (
    <span className="inline-flex" aria-label={ariaLabel} title={title}>
      <Clock3
        className="size-5 text-amber-600 dark:text-amber-300"
        aria-hidden="true"
      />
    </span>
  );
}

function extrairTrabalhoRemoto(metadados: unknown) {
  if (!metadados || typeof metadados !== "object") {
    return null;
  }

  const trabalhoRemoto = (metadados as { trabalhoRemoto?: unknown })
    .trabalhoRemoto;

  if (
    !trabalhoRemoto ||
    typeof trabalhoRemoto !== "object" ||
    !(trabalhoRemoto as { ativo?: unknown }).ativo
  ) {
    return null;
  }

  const dados = trabalhoRemoto as {
    regime?: unknown;
    descricao?: unknown;
  };

  return {
    regime: dados.regime === "HIBRIDO" ? "HIBRIDO" : "TOTAL",
    descricao:
      typeof dados.descricao === "string" ? dados.descricao : "Trabalho remoto",
  };
}

function metadadosComoObjeto(valor: unknown) {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function extrairExigeIntervalo(metadados: unknown) {
  const dados = metadadosComoObjeto(metadados);
  const jornadaSnapshot = metadadosComoObjeto(
    dados.jornadaSnapshotApuracao ?? dados.jornadaVigente,
  );
  const jornada = metadadosComoObjeto(jornadaSnapshot.jornada);

  return jornada.exigeIntervalo === false ? false : true;
}

function Resumo({
  label,
  value,
  destaque,
  detalhe,
}: {
  label: string;
  value: string;
  detalhe?: string;
  destaque?: "credito" | "debito" | "neutro";
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        destaque === "credito"
          ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
          : destaque === "debito"
            ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            : destaque === "neutro"
              ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
              : "bg-[var(--muted)]"
      }`}
    >
      <p className="text-xs font-semibold uppercase opacity-80">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
      {detalhe && (
        <p className="mt-1 text-xs font-semibold opacity-80">{detalhe}</p>
      )}
    </div>
  );
}

function ValorTempo({
  minutos,
  tipo,
  detalhe,
  estado,
}: {
  minutos: number;
  tipo: "credito" | "debito";
  detalhe?: string;
  estado?: "pendente" | "validado";
}) {
  const temValor = minutos > 0;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
        !temValor
          ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
          : estado === "pendente"
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            : estado === "validado"
              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
              : tipo === "credito"
                ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
      }`}
      title={detalhe}
    >
      {minutosParaTexto(minutos)}
    </span>
  );
}

function ValorSaldoBancoHoras({ minutos }: { minutos: number }) {
  const tipo = minutos >= 0 ? "credito" : "debito";
  const valor =
    minutos === 0 ? minutosParaTexto(0) : formatarSaldoBancoHoras(minutos);

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
        minutos === 0
          ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
          : tipo === "credito"
            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
      }`}
    >
      {valor}
    </span>
  );
}

function AcoesBancoHorasDia({
  servidorId,
  anoReferencia,
  mesReferencia,
  dataReferencia,
  minutosNaoAutorizados,
}: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
  dataReferencia: Date | string;
  minutosNaoAutorizados: number;
}) {
  if (minutosNaoAutorizados <= 0) {
    return <span className="text-xs text-[var(--muted-foreground)]">-</span>;
  }

  return (
    <form
      action={autorizarHoraExtraBancoHorasAction}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="servidorId" value={servidorId} />
      <input type="hidden" name="anoReferencia" value={anoReferencia} />
      <input type="hidden" name="mesReferencia" value={mesReferencia} />
      <input
        type="hidden"
        name="dataReferencia"
        value={chaveDataReferenciaUtc(dataReferencia)}
      />
      <input
        type="hidden"
        name="minutosMaximos"
        value={minutosNaoAutorizados}
      />
      <TempoAutorizadoInput
        key={`${servidorId}-${chaveDataReferenciaUtc(
          dataReferencia,
        )}-${minutosNaoAutorizados}`}
        name="tempoAutorizado"
        minutos={minutosNaoAutorizados}
        minutosMaximos={minutosNaoAutorizados}
        className="h-8 w-20 rounded-md border bg-[var(--background)] px-2 text-xs font-semibold tabular-nums"
        ariaLabel="Tempo a autorizar no formato horas e minutos"
        title={`Informe o tempo no formato HH:MM, até ${minutosParaTexto(
          minutosNaoAutorizados,
        )}.`}
      />
      <ConfirmarAutorizacaoHoraExtraButton />
    </form>
  );
}

function formatarSaldoBancoHoras(minutos: number) {
  if (minutos === 0) {
    return minutosParaTexto(0);
  }

  return `${minutos > 0 ? "+" : "-"}${minutosParaTexto(Math.abs(minutos))}`;
}

function agruparMarcacoesPorDia(marcacoes: MarcacaoItem[]) {
  const mapa = new Map<string, MarcacaoItem[]>();

  for (const marcacao of marcacoes) {
    const chave = chaveDataReferenciaUtc(marcacao.dataReferencia);
    const atual = mapa.get(chave) ?? [];
    atual.push(marcacao);
    mapa.set(chave, atual);
  }

  return mapa;
}

function distribuirMarcacoesNasColunas(
  marcacoes: MarcacaoItem[],
  exigeIntervalo = true,
  quantidadeColunas = 4,
) {
  const horarios: Array<{
    valor: string;
    ajustada: boolean;
    title: string;
  } | null> = Array.from({ length: quantidadeColunas }, () => null);
  const indicePorTipo: Record<string, number> = exigeIntervalo
    ? {
        ENTRADA: 0,
        SAIDA_INTERVALO: 1,
        RETORNO_INTERVALO: 2,
        SAIDA: 3,
      }
    : {
        ENTRADA: 0,
        SAIDA: 1,
        SAIDA_INTERVALO: 1,
        RETORNO_INTERVALO: 2,
      };
  const restantes: MarcacaoItem[] = [];

  for (const marcacao of marcacoes) {
    const indice = indicePorTipo[marcacao.tipo];

    if (indice === undefined || horarios[indice]) {
      restantes.push(marcacao);
      continue;
    }

    horarios[indice] = formatarMarcacaoTabela(marcacao);
  }

  for (const marcacao of restantes) {
    const indiceLivre = horarios.findIndex((horario) => !horario);

    if (indiceLivre < 0) {
      break;
    }

    horarios[indiceLivre] = formatarMarcacaoTabela(marcacao);
  }

  return horarios;
}

function rotulosColunasTempo(quantidadeColunas: number) {
  const rotulos = [
    "1ª Entrada",
    "1ª Saída",
    "2ª Entrada",
    "2ª Saída",
    "3ª Entrada",
    "3ª Saída",
  ];

  return rotulos.slice(0, Math.max(2, Math.min(6, quantidadeColunas)));
}

function extrairPrevisaoJornadaDia(metadados: unknown) {
  const previsao = metadadosComoObjeto(metadados).previsaoJornadaDia;

  if (!previsao || typeof previsao !== "object" || Array.isArray(previsao)) {
    return null;
  }

  const dados = previsao as {
    tipoDia?: unknown;
    trabalha?: unknown;
    faixas?: unknown;
  };

  return {
    tipoDia: typeof dados.tipoDia === "string" ? dados.tipoDia : null,
    trabalha: typeof dados.trabalha === "boolean" ? dados.trabalha : null,
    faixas: Array.isArray(dados.faixas) ? dados.faixas : [],
  };
}

function textoResumoHorarioPrevisto(
  previsao: ReturnType<typeof extrairPrevisaoJornadaDia>,
  quantidadeMarcacoes: number,
) {
  if (!previsao || quantidadeMarcacoes > 0) return null;

  return null;
}

function quantidadeColunasPrevistas(item: ApuracaoMensalItem) {
  const previsao = extrairPrevisaoJornadaDia(item.metadados);
  const quantidadeFaixas = previsao?.faixas.length ?? 0;

  if (quantidadeFaixas <= 0) return 4;

  return Math.max(2, Math.min(6, quantidadeFaixas * 2));
}

function calcularQuantidadeColunasMarcacoes(
  apuracoes: ApuracaoMensalItem[],
  marcacoesPorDia: Map<string, MarcacaoItem[]>,
) {
  const maiorPrevisao = apuracoes.reduce(
    (maior, item) => Math.max(maior, quantidadeColunasPrevistas(item)),
    4,
  );
  const maiorMarcacoes = Array.from(marcacoesPorDia.values()).reduce(
    (maior, marcacoesDia) => Math.max(maior, marcacoesDia.length),
    0,
  );

  return Math.min(6, Math.max(4, maiorPrevisao, maiorMarcacoes));
}

function formatarMarcacaoTabela(marcacao: MarcacaoItem) {
  return {
    valor: formatarHoraLocal(marcacao.dataHora, marcacao.fusoHorario),
    ajustada: marcacaoPossuiAjuste(marcacao),
    title: descricaoMarcacao(marcacao),
  };
}

function chaveDataReferenciaUtc(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function formatarDataReferenciaUtc(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(data);
  const diaSemana = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(data)
    .replace(".", "")
    .slice(0, 3);

  return `${dataFormatada} - ${diaSemana}`;
}

function formatarHoraLocal(valor: Date | string, fusoHorario?: string | null) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fusoHorario ?? "America/Manaus",
  }).format(data);
}
