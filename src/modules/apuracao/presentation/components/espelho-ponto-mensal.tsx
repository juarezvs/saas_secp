import { minutosParaTexto } from "../../application/services/calcular-tempo.service";
import {
  classificarDiaEspelho,
  conferenciaEspelho,
  resumirEspelhoMensal,
  rotuloSolicitacaoEspelho,
  type SolicitacaoAplicadaEspelho,
} from "../../application/services/classificar-espelho-mensal.service";

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
  tipo: string;
  fonte?: string | null;
  status: string;
};

export function EspelhoPontoMensal({
  apuracoes,
  marcacoes,
}: {
  apuracoes: ApuracaoMensalItem[];
  marcacoes: MarcacaoItem[];
}) {
  const marcacoesPorDia = agruparMarcacoesPorDiaManaus(marcacoes);

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
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Espelho mensal</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Consolidação preliminar das apurações diárias calculadas.
        </p>
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
          label="Ausencias"
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
        <table className="w-full min-w-[1220px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Marcações</th>
              <th className="px-5 py-3">Ocorrencias</th>
              <th className="px-5 py-3">Previsto</th>
              <th className="px-5 py-3">Trabalhado</th>
              <th className="px-5 py-3">Crédito</th>
              <th className="px-5 py-3">Débito</th>
              <th className="px-5 py-3">Resultado</th>
              <th className="px-5 py-3">Conferencia</th>
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
              const solicitacoesAplicadas =
                classificacao.solicitacoesAplicadas;
              const conferencia = conferenciaEspelho(item.status, item);
              const possuiMarcacaoAjustada =
                marcacoesDoDia.some(marcacaoPossuiAjuste);

              return (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-medium">
                    {formatarDataReferenciaUtc(item.dataReferencia)}
                  </td>

                  <td className="px-5 py-4">
                    {trabalhoRemoto ? (
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
                            {formatarHoraManaus(marcacao.dataHora)}
                            {marcacaoPossuiAjuste(marcacao) ? "*" : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">-</span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <OcorrenciasDia
                      ausente={classificacao.ausente}
                      ausenciaParcial={classificacao.ausenciaParcial}
                      solicitacoes={solicitacoesAplicadas}
                    />
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

                  <td className="px-5 py-4">{item.resultado}</td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${classeConferencia(
                        conferencia.tom,
                      )}`}
                      title={conferencia.descricao}
                    >
                      {conferencia.rotulo}
                    </span>
                    {(possuiMarcacaoAjustada ||
                      solicitacoesAplicadas.length > 0) && (
                      <div className="mt-2 flex flex-col gap-1">
                        {possuiMarcacaoAjustada && (
                          <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                            Ajuste aplicado
                          </span>
                        )}
                        {solicitacoesAplicadas.map((solicitacao) => (
                          <span
                            key={solicitacao.id}
                            className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                            title={`${solicitacao.tipo} - ${
                              solicitacao.coberturaIntegral
                                ? "cobertura integral"
                                : minutosParaTexto(solicitacao.minutosCobertos)
                            }`}
                          >
                            {solicitacao.trabalhoRemoto
                              ? "Trabalho remoto deferido"
                              : `${rotuloSolicitacaoEspelho(
                                  solicitacao.tipo,
                                )}: ${solicitacao.titulo}`}
                          </span>
                        ))}
                      </div>
                    )}
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
    </section>
  );
}

function OcorrenciasDia({
  ausente,
  ausenciaParcial,
  solicitacoes,
}: {
  ausente: boolean;
  ausenciaParcial: boolean;
  solicitacoes: SolicitacaoAplicadaEspelho[];
}) {
  const itens = [
    ...(ausente
      ? [{ chave: "ausencia", label: "Ausencia", classe: "erro" as const }]
      : []),
    ...(ausenciaParcial
      ? [
          {
            chave: "ausencia-parcial",
            label: "Ausencia parcial",
            classe: "alerta" as const,
          },
        ]
      : []),
    ...solicitacoes
      .filter((solicitacao) =>
        ["ATIVIDADE_EXTERNA", "VIAGEM_SERVICO", "COMPENSACAO"].includes(
          solicitacao.tipo,
        ),
      )
      .map((solicitacao) => ({
        chave: solicitacao.id,
        label: rotuloSolicitacaoEspelho(solicitacao.tipo),
        classe: "ok" as const,
      })),
  ];

  if (itens.length === 0) {
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
                : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
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

function classeConferencia(tom: "ok" | "alerta" | "neutro") {
  if (tom === "ok") {
    return "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300";
  }

  if (tom === "alerta") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300";
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

function agruparMarcacoesPorDiaManaus(marcacoes: MarcacaoItem[]) {
  const mapa = new Map<string, MarcacaoItem[]>();

  for (const marcacao of marcacoes) {
    const chave = chaveDataHoraManaus(marcacao.dataHora);
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

function chaveDataHoraManaus(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Manaus",
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

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(data);
}

function formatarHoraManaus(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Manaus",
  }).format(data);
}
