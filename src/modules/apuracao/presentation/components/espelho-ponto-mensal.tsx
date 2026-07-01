import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, PartyPopper } from "lucide-react";

import { minutosParaTexto } from "../../application/services/calcular-tempo.service";
import {
  classificarDiaEspelho,
  conferenciaEspelho,
  resumirEspelhoMensal,
  rotuloSolicitacaoEspelho,
  type SolicitacaoAplicadaEspelho,
} from "../../application/services/classificar-espelho-mensal.service";
import { AfastamentoTipoIcone } from "@/modules/servidores/presentation/components/afastamento-tipo-icone";

type ApuracaoMensalItem = {
  id: string;
  dataReferencia: Date | string;
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosCredito: number;
  minutosDebito: number;
  resultado: string;
  status: string;
  metadados?: unknown;
  contabilizarSaldos?: boolean;
  geradoParaCompetencia?: boolean;
  minutosDebitoApurado?: number;
  minutosDebitoCompensado?: number;
  ocorrencias?: {
    tipo: string;
    descricao: string;
    minutos: number;
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
}: {
  apuracoes: ApuracaoMensalItem[];
  marcacoes: MarcacaoItem[];
  controles?: ReactNode;
}) {
  const marcacoesPorDia = agruparMarcacoesPorDia(marcacoes);

  const totais = apuracoes.reduce(
    (acc, item) => {
      acc.previsto += item.cargaPrevistaMinutos;

      if (item.contabilizarSaldos !== false) {
        acc.trabalhado += item.minutosTrabalhados;
        acc.credito += item.minutosCredito;
        acc.debito += item.minutosDebito;
      }

      return acc;
    },
    {
      previsto: 0,
      trabalhado: 0,
      credito: 0,
      debito: 0,
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

      <div className="grid gap-4 border-b p-5 md:grid-cols-4 xl:grid-cols-7">
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="w-14 px-5 py-3 text-center">Sit.</th>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Marcações</th>
              <th className="px-5 py-3">Previsto</th>
              <th className="px-5 py-3">Trabalhado</th>
              <th className="px-5 py-3">Crédito</th>
              <th className="px-5 py-3">Débito</th>
            </tr>
          </thead>

          <tbody>
            {apuracoes.map((item) => {
              const chaveReferencia = chaveDataReferenciaUtc(
                item.dataReferencia,
              );
              const marcacoesDoDia = marcacoesPorDia.get(chaveReferencia) ?? [];
              const trabalhoRemoto = extrairTrabalhoRemoto(item.metadados);
              const classificacao = classificarDiaEspelho(item);
              const diaInstitucional = extrairDiaInstitucional(item.metadados);
              const dispensaPonto = classificacao.dispensaPonto;
              const solicitacoesAplicadas = classificacao.solicitacoesAplicadas;
              const justificativaAusenciaMesclada =
                encontrarJustificativaAusenciaMesclada(solicitacoesAplicadas);
              const conferencia = conferenciaEspelho(item.status, item);
              const possuiMarcacaoAjustada =
                marcacoesDoDia.some(marcacaoPossuiAjuste);
              const possuiAfastamento = (item.ocorrencias ?? []).some(
                (ocorrencia) => ocorrencia.tipo === "AFASTAMENTO",
              );
              const dicaSemaforo = montarDicaSemaforo({
                item,
                conferencia,
                possuiMarcacaoAjustada,
                solicitacoesAplicadas,
              });
              const mesclarMarcacoesOcorrencias =
                !dispensaPonto &&
                !trabalhoRemoto &&
                marcacoesDoDia.length === 0 &&
                (Boolean(diaInstitucional) ||
                  Boolean(justificativaAusenciaMesclada)) &&
                !ehFimDeSemanaInstitucional(diaInstitucional);

              return (
                <tr key={item.id} className="border-b last:border-b-0">
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

                  <td className="px-5 py-4">
                    {mesclarMarcacoesOcorrencias ? (
                      diaInstitucional ? (
                        <BadgeDiaInstitucional dia={diaInstitucional} />
                      ) : (
                        <BadgeJustificativaAusencia
                          solicitacao={justificativaAusenciaMesclada!}
                        />
                      )
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
                      <div className="flex flex-wrap gap-2">
                        {marcacoesDoDia.map((marcacao) => (
                          <span
                            key={marcacao.id}
                            className={`rounded-full border px-2 py-1 font-mono text-xs ${
                              marcacaoPossuiAjuste(marcacao)
                                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-[var(--muted)]"
                            }`}
                            title={descricaoMarcacao(marcacao)}
                          >
                            {formatarHoraLocal(
                              marcacao.dataHora,
                              marcacao.fusoHorario,
                            )}
                            {marcacaoPossuiAjuste(marcacao) ? "*" : ""}
                          </span>
                        ))}
                      </div>
                    ) : diaInstitucional &&
                      !ehFimDeSemanaInstitucional(diaInstitucional) ? (
                      <BadgeDiaInstitucional dia={diaInstitucional} />
                    ) : possuiAfastamento ? null : (
                      <span className="text-[var(--muted-foreground)]">-</span>
                    )}

                    {!mesclarMarcacoesOcorrencias && (
                      <div className={possuiAfastamento ? undefined : "mt-2"}>
                        <OcorrenciasDia
                          ocultarVazio
                          ocultarDispensaPonto={dispensaPonto}
                          ausente={classificacao.ausente}
                          ausenciaParcial={classificacao.ausenciaParcial}
                          dispensaPonto={classificacao.dispensaPonto}
                          diaInstitucional={diaInstitucional}
                          ocorrencias={item.ocorrencias ?? []}
                          solicitacoes={solicitacoesAplicadas}
                        />
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {minutosParaTexto(item.cargaPrevistaMinutos)}
                  </td>

                  <td className="px-5 py-4">
                    {minutosParaTexto(item.minutosTrabalhados)}
                  </td>

                  <td className="px-5 py-4">
                    <ValorTempo tipo="credito" minutos={item.minutosCredito} />
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
                </tr>
              );
            })}

            {apuracoes.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhuma apuração calculada para o mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OcorrenciasDia({
  ocultarVazio = false,
  ocultarDispensaPonto = false,
  ausente,
  ausenciaParcial,
  dispensaPonto,
  diaInstitucional,
  ocorrencias,
  solicitacoes,
}: {
  ocultarVazio?: boolean;
  ocultarDispensaPonto?: boolean;
  ausente: boolean;
  ausenciaParcial: boolean;
  dispensaPonto: boolean;
  diaInstitucional: DiaInstitucionalEspelho | null;
  ocorrencias: ApuracaoMensalItem["ocorrencias"];
  solicitacoes: SolicitacaoAplicadaEspelho[];
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
    ...(ausente
      ? [
          {
            chave: "ausencia",
            label: "Ausência",
            classe: "erro" as const,
            title: "Ausência integral.",
          },
        ]
      : []),
    ...(ausenciaParcial
      ? [
          {
            chave: "ausencia-parcial",
            label: "Ausência parcial",
            classe: "alerta" as const,
            title: "Ausência parcial.",
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
          !["FALTA", "DEBITO"].includes(ocorrencia.tipo) &&
          !(
            diaInstitucional &&
            ["SEM_EXPEDIENTE", diaInstitucional.tipo].includes(ocorrencia.tipo)
          ),
      )
      .map((ocorrencia, index) => ({
        chave: `ocorrencia-${index}-${ocorrencia.tipo}`,
        label: rotuloOcorrenciaEspelho(ocorrencia),
        classe:
          ocorrencia.tipo === "CREDITO" ? ("ok" as const) : ("alerta" as const),
        descricaoAfastamento:
          ocorrencia.tipo === "AFASTAMENTO"
            ? rotuloOcorrenciaEspelho(ocorrencia)
            : null,
        title: ocorrencia.descricao,
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
            item.classe === "erro"
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

function BadgeJustificativaAusencia({
  solicitacao,
}: {
  solicitacao: SolicitacaoAplicadaEspelho;
}) {
  return (
    <span
      className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
      title={`${rotuloSolicitacaoEspelho(solicitacao.tipo)} - ${
        solicitacao.titulo
      }`}
    >
      {rotuloSolicitacaoEspelho(solicitacao.tipo)}: {solicitacao.titulo}
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

function ehFimDeSemanaInstitucional(dia: DiaInstitucionalEspelho | null) {
  return dia?.tipo === "SABADO" || dia?.tipo === "DOMINGO";
}

function ehDiaInstitucionalLazer(dia: DiaInstitucionalEspelho | null) {
  return dia?.tipo === "FERIADO" || dia?.tipo === "PONTO_FACULTATIVO";
}

function marcacaoPossuiAjuste(marcacao: MarcacaoItem) {
  return (
    marcacao.status === "AJUSTADA" ||
    marcacao.fonte === "MANUAL_ADMINISTRATIVO" ||
    marcacao.tipo === "AJUSTE" ||
    marcacao.tipo === "MANUAL"
  );
}

function descricaoMarcacao(marcacao: MarcacaoItem) {
  const partes = [marcacao.tipo, marcacao.status];

  if (marcacao.fonte) {
    partes.push(marcacao.fonte);
  }

  if (marcacaoPossuiAjuste(marcacao)) {
    partes.push("ajuste aplicado");
  }

  return partes.join(" - ");
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
}) {
  if (ocorrencia.tipo === "AFASTAMENTO") {
    return rotuloAfastamentoEspelho(ocorrencia.descricao);
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

function rotuloDiaInstitucional(dia: DiaInstitucionalEspelho) {
  if (dia.tipo === "FERIADO" && dia.descricao !== "Feriado institucional") {
    return `Feriado: ${dia.descricao}`;
  }

  if (
    dia.tipo === "PONTO_FACULTATIVO" &&
    dia.descricao !== "Ponto facultativo"
  ) {
    return `Ponto facultativo: ${dia.descricao}`;
  }

  if (
    dia.tipo === "SUSPENSAO_EXPEDIENTE" &&
    dia.descricao !== "Suspensão de expediente"
  ) {
    return `Suspensão: ${dia.descricao}`;
  }

  if (dia.tipo === "RECESSO_FORENSE") {
    return dia.descricao;
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

  return linhas.filter(Boolean).join("\n");
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
}: {
  minutos: number;
  tipo: "credito" | "debito";
  detalhe?: string;
}) {
  const temValor = minutos > 0;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
        !temValor
          ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
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
