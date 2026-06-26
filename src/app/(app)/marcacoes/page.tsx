import Link from "next/link";
import { Clock, Clock3, Plus, Save, Trash2 } from "lucide-react";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { SearchableSelect } from "@/components/ui";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { PERMISSOES_ACESSO_REGISTRO_PONTO_SECP } from "@/modules/auth/domain/constants/perfis-sistema";
import { obterRotuloTipoMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { formatarDataHoraPtBr } from "@/modules/marcacoes/application/services/data-marcacao.service";
import {
  atualizarMarcacaoNutecAction,
  excluirMarcacaoNutecAction,
  incluirMarcacaoNutecAction,
} from "@/modules/marcacoes/application/actions/manter-marcacao-nutec.action";
import { usuarioAtualEhNutec } from "@/modules/marcacoes/application/services/permissao-manutencao-marcacao.service";
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

const tiposMarcacaoManutencao = [
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA",
  "MANUAL",
  "AJUSTE",
];

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

export default async function MarcacoesPage({ searchParams }: MarcacoesPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "marcacoes:consultar:proprio",
    "marcacoes:visualizar:proprio",
    "marcacoes:consultar:global",
  ]);

  const params = await searchParams;
  const session = await auth();
  const permissoes = session?.user.perfilAtivo?.permissoes ?? [];
  const perfilCodigo = session?.user.perfilAtivo?.codigo;
  const podeConsultarGlobal = permissoes.includes("marcacoes:consultar:global");
  const podeFiltrarServidor = podeConsultarGlobal && perfilCodigo !== "SERVIDOR";
  const servidorIdFiltro = podeFiltrarServidor ? params?.servidorId || null : null;
  const podeRegistrarPontoPeloSecp = PERMISSOES_ACESSO_REGISTRO_PONTO_SECP.some(
    (permissao) => permissoes.includes(permissao),
  );
  const podeManterMarcacoesNutec = await usuarioAtualEhNutec();

  const { marcacoes } = session?.user
    ? await listarMarcacoesDoUsuarioNoDia(session.user.id)
    : { marcacoes: [] };

  const [ultimasMarcacoes, servidoresFiltro] = await Promise.all([
    podeConsultarGlobal
      ? listarUltimasMarcacoes({ limite: 30, servidorId: servidorIdFiltro })
      : Promise.resolve([]),
    podeFiltrarServidor ? listarServidoresParaFiltroMarcacoes() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Marcações" }]} />

      <PageHeader
        icon={Clock}
        titulo="Marcações de ponto"
        descricao="Consulte suas marcações do dia e registre novo horário."
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

      <MarcacoesDiaCard marcacoes={marcacoes} />

      {podeConsultarGlobal && (
        <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
          <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Clock3 className="size-5 text-blue-900 dark:text-blue-300" />
              <h2 className="text-lg font-bold">Últimas marcações registradas</h2>
            </div>

            {podeFiltrarServidor && (
              <form className="flex flex-col gap-2 sm:flex-row sm:items-center" action="/marcacoes">
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
                  <label htmlFor="novaMarcacaoServidorId" className="text-sm font-semibold">
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
                  <label htmlFor="novaMarcacaoData" className="text-sm font-semibold">
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
                  <label htmlFor="novaMarcacaoHora" className="text-sm font-semibold">
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
                  <label htmlFor="novaMarcacaoTipo" className="text-sm font-semibold">
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
                  <label htmlFor="novaMarcacaoObservacao" className="text-sm font-semibold">
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
                  {podeManterMarcacoesNutec && (
                    <th className="px-5 py-3">Manutencao NUTEC</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {ultimasMarcacoes.map((marcacao) => {
                  const lotacaoAtual = marcacao.servidor.lotacoes[0];
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
                        {lotacaoAtual?.unidade.sigla ?? "-"}
                      </td>

                      <td className="px-5 py-4">
                        {obterRotuloTipoMarcacao(marcacao.tipo)}
                      </td>

                      <td className="px-5 py-4">
                        <OrigemMarcacaoIcon origem={marcacao.fonte} />
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

                      {podeManterMarcacoesNutec && (
                        <td className="px-5 py-4">
                          <div className="flex min-w-[45rem] flex-col gap-2">
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
                                <Trash2 className="size-3.5" aria-hidden="true" />
                                Excluir
                              </button>
                            </form>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {ultimasMarcacoes.length === 0 && (
                  <tr>
                    <td
                      colSpan={podeManterMarcacoesNutec ? 7 : 6}
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
