import Link from "next/link";
import { CalendarClock, Plus } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarJornadas,
  listarJornadasAtivas,
  listarServidoresAtivosParaJornada,
} from "@/modules/jornadas/infrastructure/repositories/jornada.repository";
import { atribuirJornadaServidorAction } from "@/modules/jornadas/application/actions/atribuir-jornada-servidor.action";
import { JornadaServidorForm } from "@/modules/jornadas/presentation/components/jornada-servidor-form";

function minutosParaHoras(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${resto}`;
}

export default async function JornadasPage() {
  await exigirPermissaoOuRedirecionar("jornadas:gerenciar:global");

  const [jornadas, jornadasAtivas, servidores] = await Promise.all([
    listarJornadas(),
    listarJornadasAtivas(),
    listarServidoresAtivosParaJornada(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Jornadas" }]} />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Jornada e escala
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Jornadas
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
            Gerencie jornadas de 7h, 8h, especiais e atribuições de jornada aos
            servidores.
          </p>
        </div>

        <Link
          href="/jornadas/nova"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova jornada
        </Link>
      </section>

      <RegraPortariaCard
        artigo="Arts. 4º, 8º e 18"
        titulo="Jornada cadastrada e apuração futura"
        descricao="O sistema deve manter a jornada a ser cumprida pelo servidor, permitindo apurar a carga mensal e comparar com a jornada esperada no mês de referência."
      />

      <JornadaServidorForm
        action={atribuirJornadaServidorAction}
        servidores={servidores}
        jornadas={jornadasAtivas}
      />

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <CalendarClock className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Jornadas cadastradas</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Carga</th>
                <th className="px-5 py-3">Intervalo</th>
                <th className="px-5 py-3">Escalas</th>
                <th className="px-5 py-3">Servidores</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {jornadas.map((jornada) => (
                <tr key={jornada.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-mono text-xs font-semibold">
                    {jornada.codigo}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">{jornada.nome}</div>
                    {jornada.descricao && (
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {jornada.descricao}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                    {jornada.tipo}
                  </td>
                  <td className="px-5 py-4">
                    {minutosParaHoras(jornada.cargaDiariaMinutos)}
                  </td>
                  <td className="px-5 py-4">
                    {jornada.exigeIntervalo
                      ? `${jornada.intervaloMinimoMinutos ?? "-"} a ${
                          jornada.intervaloMaximoMinutos ?? "-"
                        } min`
                      : "Não"}
                  </td>
                  <td className="px-5 py-4">{jornada._count.escalas}</td>
                  <td className="px-5 py-4">{jornada._count.servidores}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        jornada.ativo
                          ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {jornada.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/jornadas/${jornada.id}`}
                      className="text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                    >
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {jornadas.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhuma jornada cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}