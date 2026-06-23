import Link from "next/link";
import { Clock, Clock3, Plus } from "lucide-react";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { PERMISSOES_ACESSO_REGISTRO_PONTO_SECP } from "@/modules/auth/domain/constants/perfis-sistema";
import { obterRotuloTipoMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { formatarDataHoraPtBr } from "@/modules/marcacoes/application/services/data-marcacao.service";
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
                <select
                  id="servidorId"
                  name="servidorId"
                  defaultValue={servidorIdFiltro ?? ""}
                  className="h-10 min-w-72 rounded-md border bg-[var(--card)] px-3 text-sm"
                >
                  <option value="">Todos os servidores</option>
                  {servidoresFiltro.map((servidor) => (
                    <option key={servidor.id} value={servidor.id}>
                      {nomeServidor(servidor) || servidor.matricula} - {servidor.matricula}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="h-10 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-950"
                >
                  Filtrar
                </button>
              </form>
            )}
          </div>

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
                </tr>
              </thead>

              <tbody>
                {ultimasMarcacoes.map((marcacao) => {
                  const lotacaoAtual = marcacao.servidor.lotacoes[0];

                  return (
                    <tr key={marcacao.id} className="border-b last:border-b-0">
                      <td className="px-5 py-4">
                        {formatarDataHoraPtBr(marcacao.dataHora)}
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
                    </tr>
                  );
                })}

                {ultimasMarcacoes.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
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
