import { FileCheck2 } from "lucide-react";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { recalcularApuracaoDiaAction } from "@/modules/apuracao/application/actions/recalcular-apuracao-dia.action";
import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { ApuracaoDiaCard } from "@/modules/apuracao/presentation/components/apuracao-dia-card";
import {
  buscarApuracaoDiaria,
  buscarServidorComUsuarioPorUsuarioId,
} from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";

export default async function ApuracaoPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "apuracao:consultar:proprio",
    "apuracao:consultar:global",
    "apuracao:recalcular:global",
  ]);

  const session = await auth();

  const servidor = session?.user
    ? await buscarServidorComUsuarioPorUsuarioId(session.user.id)
    : null;

  const hoje = normalizarDataReferencia(new Date());

  const apuracao = servidor
    ? await buscarApuracaoDiaria({
        servidorId: servidor.id,
        dataReferencia: hoje,
      })
    : null;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Apuracao" }]} />

      <PageHeader
        icon={FileCheck2}
        titulo="Apuracao de frequencia"
        descricao="Calcule a apuracao diaria com base nas marcacoes registradas e na jornada vigente do servidor."
        artigo="Art. 8"
        regraTitulo="Carga horaria mensal e horas trabalhadas"
        regraDescricao="A apuracao compara as horas efetivamente trabalhadas com a carga horaria prevista, permitindo identificar credito, debito e inconsistencias."
      />

      {servidor ? (
        <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <h2 className="text-lg font-bold">{servidor.usuario.nome}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Matricula: {servidor.matricula}
          </p>

          <form action={recalcularApuracaoDiaAction} className="mt-5 flex gap-3">
            <input type="hidden" name="servidorId" value={servidor.id} />
            <input
              type="date"
              name="dataReferencia"
              defaultValue={hoje.toISOString().slice(0, 10)}
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            />

            <button
              type="submit"
              className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            >
              Recalcular
            </button>
          </form>
        </section>
      ) : (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Nenhum servidor ativo foi encontrado para o usuario autenticado.
        </section>
      )}

      <ApuracaoDiaCard apuracao={apuracao} />
    </div>
  );
}
