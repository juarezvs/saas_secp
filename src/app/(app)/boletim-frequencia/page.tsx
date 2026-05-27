import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { gerarBoletimFrequenciaAction } from "@/modules/boletim-frequencia/application/actions/gerar-boletim-frequencia.action";
import {
  listarBoletinsFrequencia,
  listarFechamentosHomologadosSemBoletim,
} from "@/modules/boletim-frequencia/infrastructure/repositories/boletim-frequencia.repository";
import {
  classeStatusBoletim,
  rotuloStatusBoletim,
} from "@/modules/boletim-frequencia/application/services/formatar-boletim-frequencia.service";

export default async function BoletimFrequenciaPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "boletim-frequencia:gerar:chefia",
    "boletim-frequencia:consultar:global",
  ]);

  const [boletins, fechamentosDisponiveis] = await Promise.all([
    listarBoletinsFrequencia(),
    listarFechamentosHomologadosSemBoletim(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Boletim de Frequência" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Boletim de Frequência
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Boletins mensais
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Gere, consulte e encaminhe à SECAP/NUCGP os boletins mensais de
          frequência das unidades homologadas.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Arts. 16 e 17"
        titulo="Boletim após homologação"
        descricao="Após a homologação da frequência mensal, o boletim consolida as ocorrências e deve ser encaminhado à SECAP/NUCGP dentro do prazo regulamentar."
      />

      <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">
          Gerar boletim de fechamento homologado
        </h2>

        <form action={gerarBoletimFrequenciaAction} className="mt-4 space-y-4">
          <select
            name="fechamentoId"
            defaultValue=""
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            required
          >
            <option value="">Selecione o fechamento homologado</option>

            {fechamentosDisponiveis.map((fechamento) => (
              <option key={fechamento.id} value={fechamento.id}>
                {fechamento.unidade.sigla} —{" "}
                {String(fechamento.mesReferencia).padStart(2, "0")}/
                {fechamento.anoReferencia} — {fechamento.servidores.length}{" "}
                servidores
              </option>
            ))}
          </select>

          <textarea
            name="observacao"
            rows={3}
            placeholder="Observação opcional para o boletim"
            className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
          />

          <button
            type="submit"
            className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
          >
            Gerar boletim
          </button>
        </form>
      </section>

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <FileCheck2 className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Boletins gerados</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Referência</th>
                <th className="px-5 py-3">Unidade</th>
                <th className="px-5 py-3">Servidores</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Processo SEI</th>
                <th className="px-5 py-3">Gerado por</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {boletins.map((boletim) => (
                <tr key={boletim.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-semibold">
                    {String(boletim.mesReferencia).padStart(2, "0")}/
                    {boletim.anoReferencia}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold">{boletim.unidade.sigla}</div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {boletim.unidade.nome}
                    </div>
                  </td>

                  <td className="px-5 py-4">{boletim._count.servidores}</td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${classeStatusBoletim(
                        boletim.status,
                      )}`}
                    >
                      {rotuloStatusBoletim(boletim.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4">{boletim.processoSei ?? "-"}</td>

                  <td className="px-5 py-4">{boletim.geradoPor.nome}</td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/boletim-frequencia/${boletim.id}`}
                      className="text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                    >
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {boletins.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum boletim gerado.
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
