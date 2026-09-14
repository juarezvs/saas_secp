import { redirect } from "next/navigation";
import { TreePalm } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  buscarProgramacaoFeriasPorId,
  listarSaldosFeriasServidor,
} from "@/modules/programacao-ferias/infrastructure/repositories/programacao-ferias.repository";
import {
  FormEditarProgramacaoFerias,
  MensagemFerias,
  StatusProgramacaoFeriasBadge,
} from "@/modules/programacao-ferias/presentation/components/programacao-ferias-ui";
import { formatarDataFerias } from "@/modules/programacao-ferias/application/services/programacao-ferias-status.service";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ok?: string; erro?: string }>;
};

export default async function MinhaProgramacaoFeriasPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, query, permissao] = await Promise.all([
    params,
    searchParams,
    exigirUmaDasPermissoesOuRedirecionar([
      "programacao-ferias:consultar:proprio",
      "programacao-ferias:solicitar:proprio",
    ]),
  ]);

  if (!permissao.usuarioId) redirect("/login");

  const programacao = await buscarProgramacaoFeriasPorId(id);
  if (!programacao || programacao.servidor.usuarioId !== permissao.usuarioId) {
    redirect("/minhas-ferias?erro=Programação de férias não localizada.");
  }

  const saldos = await listarSaldosFeriasServidor(programacao.servidorId, [
    programacao.exercicio,
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Início", href: "/dashboard" },
          { label: "Minhas férias", href: "/minhas-ferias" },
          { label: "Programação" },
        ]}
      />

      <PageHeader
        icon={TreePalm}
        titulo="Programação de férias"
        descricao="Acompanhe o status do pedido e ajuste enquanto a chefia ainda não deliberou."
      />

      <MensagemFerias ok={query?.ok} erro={query?.erro} />

      <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
              Período
            </p>
            <p className="mt-1 font-semibold">
              {formatarDataFerias(programacao.dataInicio)} até{" "}
              {formatarDataFerias(programacao.dataFim)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
              Exercício
            </p>
            <p className="mt-1 font-semibold">{programacao.exercicio}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
              Dias
            </p>
            <p className="mt-1 font-semibold">{programacao.dias}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
              Status
            </p>
            <div className="mt-1">
              <StatusProgramacaoFeriasBadge status={programacao.status} />
            </div>
          </div>
        </div>
      </section>

      <FormEditarProgramacaoFerias programacao={programacao} saldos={saldos} />

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-bold">Histórico</h2>
        </div>
        <div className="grid gap-3 p-5">
          {programacao.eventos.map((evento) => (
            <div key={evento.id} className="rounded-md border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusProgramacaoFeriasBadge status={evento.statusNovo} />
                <span className="text-xs text-[var(--muted-foreground)]">
                  {formatarDataFerias(evento.criadoEm)}
                </span>
              </div>
              <p className="mt-2 text-sm">{evento.descricao}</p>
              {evento.usuario && (
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {evento.usuario.nome}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
