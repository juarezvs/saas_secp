import Link from "next/link";
import { Clock, Clock3, Plus } from "lucide-react";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { obterRotuloTipoMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { formatarDataHoraPtBr } from "@/modules/marcacoes/application/services/data-marcacao.service";
import {
  listarMarcacoesDoUsuarioNoDia,
  listarUltimasMarcacoes,
} from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { MarcacoesDiaCard } from "@/modules/marcacoes/presentation/components/marcacoes-dia-card";
import { OrigemMarcacaoIcon } from "@/modules/marcacoes/presentation/components/origem-marcacao-icon";

export default async function MarcacoesPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "marcacoes:consultar:proprio",
    "marcacoes:visualizar:proprio",
    "marcacoes:consultar:global",
  ]);

  const session = await auth();
  const permissoes = session?.user.perfilAtivo?.permissoes ?? [];
  const podeConsultarGlobal = permissoes.includes("marcacoes:consultar:global");

  const { marcacoes } = session?.user
    ? await listarMarcacoesDoUsuarioNoDia(session.user.id)
    : { marcacoes: [] };

  const ultimasMarcacoes = podeConsultarGlobal
    ? await listarUltimasMarcacoes({ limite: 30 })
    : [];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Marcacoes" }]} />

      <PageHeader
        icon={Clock}
        titulo="Marcacoes de ponto"
        descricao="Consulte suas marcacoes do dia e registre novo horario."
        artigo="Art. 6"
        regraTitulo="Marcacao de entrada, saida e intervalo"
        regraDescricao="O sistema registra entrada, saida, saida para intervalo e retorno do intervalo, permitindo futura apuracao da jornada diaria e mensal."
        actions={
          <Link
            href="/marcacoes/registrar"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
          >
            <Plus className="size-4" aria-hidden="true" />
            Registrar horario
          </Link>
        }
      />

      <MarcacoesDiaCard marcacoes={marcacoes} />

      {podeConsultarGlobal && (
        <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
          <div className="flex items-center gap-2 border-b p-5">
            <Clock3 className="size-5 text-blue-900 dark:text-blue-300" />
            <h2 className="text-lg font-bold">Ultimas marcacoes registradas</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-240 text-left text-sm">
              <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Data/hora</th>
                  <th className="px-5 py-3">Servidor</th>
                  <th className="px-5 py-3">Lotacao</th>
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
                          {marcacao.servidor.usuario.nome}
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
                      Nenhuma marcacao encontrada.
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
