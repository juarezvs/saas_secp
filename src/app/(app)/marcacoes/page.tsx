import Link from "next/link";
import { Clock, Clock3, Plus, Save, Trash2 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { SearchableSelect } from "@/components/ui";
import { perfilAtivoEhChefia } from "@/modules/auth/application/services/perfil-chefia.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { PERMISSOES_ACESSO_REGISTRO_PONTO_SECP } from "@/modules/auth/domain/constants/perfis-sistema";
import { listarServidoresParaEspelhoPonto } from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import { obterRotuloTipoMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { formatarDataHoraPtBr } from "@/modules/marcacoes/application/services/data-marcacao.service";
import {
  atualizarMarcacaoNutecAction,
  excluirMarcacaoNutecAction,
  incluirMarcacaoNutecAction,
} from "@/modules/marcacoes/application/actions/manter-marcacao-nutec.action";
import {
  PERMISSAO_EXCLUIR_MARCACOES,
  PERMISSAO_EXCLUIR_MARCACOES_SECCIONAL,
  usuarioEhNutec,
} from "@/modules/marcacoes/application/services/permissao-manutencao-marcacao.service";
import {
  listarMarcacoesDoUsuarioNoDia,
  listarServidoresParaFiltroMarcacoes,
  listarUltimasMarcacoes,
} from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { MarcacoesDiaCard } from "@/modules/marcacoes/presentation/components/marcacoes-dia-card";
import { OrigemMarcacaoIcon } from "@/modules/marcacoes/presentation/components/origem-marcacao-icon";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

type MarcacoesPageProps = {
  searchParams?: Promise<{
    servidorId?: string;
  }>;
};

type UnidadeLotacaoArvore = {
  id: string;
  sigla: string;
  nome: string;
  orgao?: {
    sigla?: string | null;
  } | null;
  unidadePai?: UnidadeLotacaoArvore | null;
};

const tiposMarcacaoManutencao = [
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA",
  "MANUAL",
  "AJUSTE",
];

function montarArvoreLotacao(unidade?: UnidadeLotacaoArvore | null) {
  const arvore: UnidadeLotacaoArvore[] = [];
  const visitados = new Set<string>();
  let atual = unidade ?? null;

  while (atual && !visitados.has(atual.id)) {
    visitados.add(atual.id);
    arvore.unshift(atual);
    atual = atual.unidadePai ?? null;
  }

  return arvore;
}

function rotuloUnidadeLotacao(unidade: UnidadeLotacaoArvore) {
  if (!unidade.nome || unidade.nome === unidade.sigla) {
    return unidade.sigla;
  }

  return `${unidade.sigla} - ${unidade.nome}`;
}

function normalizarArvoreLotacaoPorOrgao(
  orgaoSigla: string | null | undefined,
  unidades: UnidadeLotacaoArvore[],
) {
  const siglaOrgao = orgaoSigla?.trim();

  if (!siglaOrgao) {
    return unidades;
  }

  const indiceUnidadeOrgao = unidades.findIndex(
    (unidade) => unidade.sigla.trim() === siglaOrgao,
  );

  return indiceUnidadeOrgao >= 0
    ? unidades.slice(indiceUnidadeOrgao)
    : unidades;
}

function montarSiglasLotacaoComOrgao(
  orgaoSigla: string | null | undefined,
  unidades: UnidadeLotacaoArvore[],
) {
  const unidadesNormalizadas = normalizarArvoreLotacaoPorOrgao(
    orgaoSigla,
    unidades,
  );
  const primeiraUnidade = unidadesNormalizadas[0]?.sigla.trim();
  const siglaOrgao = orgaoSigla?.trim();
  const siglas = [
    primeiraUnidade === siglaOrgao ? null : siglaOrgao,
    ...unidadesNormalizadas.map((unidade) => unidade.sigla),
  ];
  const partes: string[] = [];

  for (const sigla of siglas) {
    const valor = sigla?.trim();

    if (!valor || partes.at(-1) === valor) {
      continue;
    }

    partes.push(valor);
  }

  return partes.join(" / ");
}

function partesDataHoraLocal(data: Date, fusoHorario?: string | null) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario ?? "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  return {
    data: `${valor("year")}-${valor("month")}-${valor("day")}`,
    hora: `${valor("hour")}:${valor("minute")}`,
  };
}

export default async function MarcacoesPage({
  searchParams,
}: MarcacoesPageProps) {
  const [permissao, params] = await Promise.all([
    exigirUmaDasPermissoesOuRedirecionar([
      "marcacoes:consultar:proprio",
      "marcacoes:visualizar:proprio",
      "marcacoes:consultar:global",
      "homologacao:gerenciar:chefia",
      "minha-equipe:consultar:chefia",
    ]),
    searchParams,
  ]);

  const permissoes = permissao.permissoes;
  const perfilCodigo = permissao.perfilAtivoCodigo;
  const podeConsultarGlobal = permissoes.includes("marcacoes:consultar:global");
  const perfilChefiaAtivo = perfilAtivoEhChefia({
    perfilAtivoCodigo: perfilCodigo,
    permissoes,
  });
  const podeConsultarEscopoChefia =
    perfilChefiaAtivo &&
    (permissoes.includes("homologacao:gerenciar:chefia") ||
      permissoes.includes("minha-equipe:consultar:chefia"));
  const podeConsultarLista = podeConsultarGlobal || podeConsultarEscopoChefia;
  const podeFiltrarServidor = podeConsultarLista && perfilCodigo !== "SERVIDOR";
  const podeRegistrarPontoPeloSecp = PERMISSOES_ACESSO_REGISTRO_PONTO_SECP.some(
    (permissao) => permissoes.includes(permissao),
  );
  const servidoresChefia =
    podeConsultarEscopoChefia && permissao.usuarioId
      ? await listarServidoresParaEspelhoPonto({
          usuarioId: permissao.usuarioId,
          escopo: "chefia",
        })
      : [];
  const [podeManterMarcacoesNutec, marcacoesUsuarioResultado] =
    await Promise.all([
      permissao.usuarioId ? usuarioEhNutec(permissao.usuarioId) : false,
      permissao.usuarioId
        ? listarMarcacoesDoUsuarioNoDia(permissao.usuarioId)
        : Promise.resolve({
            servidor: null,
            marcacoes: [],
            exigeIntervalo: true,
          }),
    ]);
  const servidorProprio = marcacoesUsuarioResultado.servidor;
  const servidorIdsPermitidosChefia = podeConsultarEscopoChefia
    ? Array.from(
        new Set([
          ...(servidorProprio ? [servidorProprio.id] : []),
          ...servidoresChefia.map((servidor) => servidor.id),
        ]),
      )
    : undefined;
  const servidorIdParam = params?.servidorId || null;
  const servidorIdFiltro =
    podeFiltrarServidor &&
    (!servidorIdsPermitidosChefia ||
      servidorIdsPermitidosChefia.includes(servidorIdParam ?? ""))
      ? servidorIdParam
      : null;
  const [ultimasMarcacoes, servidoresFiltro] = await Promise.all([
    podeConsultarLista
      ? listarUltimasMarcacoes({
          limite: 30,
          servidorId: servidorIdFiltro,
          servidorIdsPermitidos: servidorIdsPermitidosChefia,
        })
      : Promise.resolve([]),
    podeFiltrarServidor
      ? listarServidoresParaFiltroMarcacoes({
          servidorIdsPermitidos: servidorIdsPermitidosChefia,
        })
      : Promise.resolve([]),
  ]);
  const podeExcluirMarcacoes =
    permissoes.includes(PERMISSAO_EXCLUIR_MARCACOES) ||
    permissoes.includes(PERMISSAO_EXCLUIR_MARCACOES_SECCIONAL) ||
    podeManterMarcacoesNutec;
  const podeExibirManutencaoMarcacoes =
    podeManterMarcacoesNutec || podeExcluirMarcacoes;
  const { marcacoes, exigeIntervalo } = marcacoesUsuarioResultado;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Ponto de Hoje" }]} />

      <PageHeader
        icon={Clock}
        titulo="Ponto de Hoje"
        descricao="Consulte os registros de hoje e registre novo horário."
        artigo="Art. 6"
        regraTitulo="Marcação de entrada, saída e intervalo"
        regraDescricao="O sistema registra entrada, saída, saída para intervalo e retorno do intervalo, permitindo futura apuração da jornada diária e mensal."
        actions={
          podeRegistrarPontoPeloSecp ? (
            <Link
              href="/marcacoes/registrar"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
            >
              <Plus className="size-4" aria-hidden="true" />
              Registrar horário
            </Link>
          ) : null
        }
      />

      <MarcacoesDiaCard
        marcacoes={marcacoes.map((marcacao) => ({
          ...marcacao,
          evidenciaFacialUrl: marcacao.evidenciaFacial
            ? `/api/marcacoes/${marcacao.id}/evidencia-facial`
            : null,
        }))}
        exigeIntervalo={exigeIntervalo}
      />

      {podeConsultarLista && (
        <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
          <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Clock3 className="size-5 text-blue-900 dark:text-blue-300" />
              <h2 className="text-lg font-bold">
                Últimas marcações registradas
              </h2>
            </div>

            {podeFiltrarServidor && (
              <form
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
                action="/marcacoes"
              >
                <label htmlFor="servidorId" className="text-sm font-semibold">
                  Servidor
                </label>
                <SearchableSelect
                  id="servidorId"
                  name="servidorId"
                  defaultValue={servidorIdFiltro ?? ""}
                  className="min-w-72"
                  placeholder="Todos os servidores"
                  searchPlaceholder="Pesquisar por nome ou matricula..."
                  options={[
                    { value: "", label: "Todos os servidores" },
                    ...servidoresFiltro.map((servidor) => {
                      const nome = nomeServidor(servidor) || servidor.matricula;

                      return {
                        value: servidor.id,
                        label: `${nome} - ${servidor.matricula}`,
                        searchText: `${nome} ${servidor.matricula}`,
                      };
                    }),
                  ]}
                />
                <button
                  type="submit"
                  className="h-10 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-950"
                >
                  Filtrar
                </button>
              </form>
            )}
          </div>

          {podeManterMarcacoesNutec && (
            <div className="border-b bg-[var(--muted)]/40 p-5">
              <form
                action={incluirMarcacaoNutecAction}
                className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_150px_120px_190px_minmax(180px,1fr)_auto] lg:items-end"
              >
                <div>
                  <label
                    htmlFor="novaMarcacaoServidorId"
                    className="text-sm font-semibold"
                  >
                    Servidor
                  </label>
                  <SearchableSelect
                    id="novaMarcacaoServidorId"
                    name="servidorId"
                    required
                    placeholder="Selecione o servidor"
                    searchPlaceholder="Pesquisar por nome ou matricula..."
                    options={servidoresFiltro.map((servidor) => {
                      const nome = nomeServidor(servidor) || servidor.matricula;

                      return {
                        value: servidor.id,
                        label: `${nome} - ${servidor.matricula}`,
                        searchText: `${nome} ${servidor.matricula}`,
                      };
                    })}
                  />
                </div>

                <div>
                  <label
                    htmlFor="novaMarcacaoData"
                    className="text-sm font-semibold"
                  >
                    Data
                  </label>
                  <input
                    id="novaMarcacaoData"
                    type="date"
                    name="dataReferencia"
                    className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="novaMarcacaoHora"
                    className="text-sm font-semibold"
                  >
                    Hora
                  </label>
                  <input
                    id="novaMarcacaoHora"
                    type="time"
                    name="hora"
                    className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="novaMarcacaoTipo"
                    className="text-sm font-semibold"
                  >
                    Tipo
                  </label>
                  <select
                    id="novaMarcacaoTipo"
                    name="tipo"
                    className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                    required
                  >
                    {tiposMarcacaoManutencao.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {obterRotuloTipoMarcacao(tipo)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="novaMarcacaoObservacao"
                    className="text-sm font-semibold"
                  >
                    Observacao
                  </label>
                  <input
                    id="novaMarcacaoObservacao"
                    name="observacao"
                    className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                    placeholder="Opcional"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-950"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Incluir
                </button>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-240 text-left text-sm">
              <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Data/hora</th>
                  <th className="px-5 py-3">Servidor</th>
                  <th className="px-5 py-3">Lotação</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Fonte</th>
                  <th className="px-5 py-3">Status</th>
                  {podeExibirManutencaoMarcacoes && (
                    <th className="px-5 py-3">Manutencao</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {ultimasMarcacoes.map((marcacao) => {
                  const lotacaoAtual = marcacao.servidor.lotacoes[0];
                  const arvoreLotacao = montarArvoreLotacao(
                    lotacaoAtual?.unidade,
                  );
                  const siglasLotacao = montarSiglasLotacaoComOrgao(
                    lotacaoAtual?.unidade.orgao?.sigla,
                    arvoreLotacao,
                  );
                  const camposDataHora = partesDataHoraLocal(
                    marcacao.dataHora,
                    marcacao.fusoHorario,
                  );

                  return (
                    <tr key={marcacao.id} className="border-b last:border-b-0">
                      <td className="px-5 py-4">
                        {formatarDataHoraPtBr(
                          marcacao.dataHora,
                          marcacao.fusoHorario,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold">
                          {nomeServidor(marcacao.servidor)}
                        </div>
                        <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                          {marcacao.servidor.matricula}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {lotacaoAtual?.unidade ? (
                          <div className="max-w-[26rem]">
                            <div className="font-semibold text-[var(--foreground)]">
                              {rotuloUnidadeLotacao(lotacaoAtual.unidade)}
                            </div>
                            <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                              {siglasLotacao || lotacaoAtual.unidade.sigla}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {obterRotuloTipoMarcacao(marcacao.tipo)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <OrigemMarcacaoIcon origem={marcacao.fonte} />
                          {marcacao.evidenciaFacial ? (
                            <img
                              src={`/api/marcacoes/${marcacao.id}/evidencia-facial`}
                              alt="Evidência facial da marcação"
                              loading="lazy"
                              className="size-8 rounded-full border object-cover"
                            />
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            marcacao.status === "VALIDA"
                              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {marcacao.status}
                        </span>
                      </td>

                      {podeExibirManutencaoMarcacoes && (
                        <td className="px-5 py-4">
                          <div
                            className={
                              podeManterMarcacoesNutec
                                ? "flex min-w-[45rem] flex-col gap-2"
                                : "flex flex-col gap-2"
                            }
                          >
                            {podeManterMarcacoesNutec && (
                              <form
                                action={atualizarMarcacaoNutecAction.bind(
                                  null,
                                  marcacao.id,
                                )}
                                className="grid gap-2 sm:grid-cols-[130px_100px_170px_minmax(160px,1fr)_auto]"
                              >
                                <input
                                  type="hidden"
                                  name="servidorId"
                                  value={marcacao.servidorId}
                                />
                                <input
                                  type="date"
                                  name="dataReferencia"
                                  defaultValue={camposDataHora.data}
                                  className="h-9 rounded-md border bg-[var(--card)] px-2 text-xs"
                                  required
                                />
                                <input
                                  type="time"
                                  name="hora"
                                  defaultValue={camposDataHora.hora}
                                  className="h-9 rounded-md border bg-[var(--card)] px-2 text-xs"
                                  required
                                />
                                <select
                                  name="tipo"
                                  defaultValue={marcacao.tipo}
                                  className="h-9 rounded-md border bg-[var(--card)] px-2 text-xs"
                                  required
                                >
                                  {tiposMarcacaoManutencao.map((tipo) => (
                                    <option key={tipo} value={tipo}>
                                      {obterRotuloTipoMarcacao(tipo)}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  name="observacao"
                                  defaultValue={marcacao.observacao ?? ""}
                                  className="h-9 rounded-md border bg-[var(--card)] px-2 text-xs"
                                  placeholder="Observacao"
                                />
                                <button
                                  type="submit"
                                  className="inline-flex size-9 items-center justify-center rounded-md border text-blue-900 hover:bg-[var(--muted)] dark:text-blue-300"
                                  title="Salvar ajuste"
                                >
                                  <Save className="size-4" aria-hidden="true" />
                                  <span className="sr-only">Salvar ajuste</span>
                                </button>
                              </form>
                            )}

                            {podeExcluirMarcacoes && (
                              <form
                                action={excluirMarcacaoNutecAction.bind(
                                  null,
                                  marcacao.id,
                                )}
                              >
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
                                >
                                  <Trash2
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                  Excluir
                                </button>
                              </form>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {ultimasMarcacoes.length === 0 && (
                  <tr>
                    <td
                      colSpan={podeExibirManutencaoMarcacoes ? 7 : 6}
                      className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                    >
                      Nenhuma marcação encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
