import Link from "next/link";
import { ArrowLeft, CircleAlert, ClockAlert, Copy } from "lucide-react";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { normalizarFusoHorario } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { resolverFusoHorarioServidor } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

type TipoProblemaAfd = "erros" | "pendentes" | "duplicadas";

const configuracaoTipo = {
  erros: {
    titulo: "Erros encontrados",
    descricao: "Falhas de leitura, validação ou processamento dos arquivos.",
    icon: CircleAlert,
  },
  pendentes: {
    titulo: "Marcações pendentes",
    descricao:
      "Marcações brutas que ainda não puderam gerar uma marcação de ponto.",
    icon: ClockAlert,
  },
  duplicadas: {
    titulo: "Marcações duplicadas",
    descricao:
      "Registros já existentes que foram ignorados para preservar a idempotência.",
    icon: Copy,
  },
} satisfies Record<
  TipoProblemaAfd,
  { titulo: string; descricao: string; icon: typeof CircleAlert }
>;

function normalizarTipo(valor: string | undefined): TipoProblemaAfd {
  return valor === "pendentes" || valor === "duplicadas" ? valor : "erros";
}

function formatarDataHora(data: Date, fusoHorario?: string | null) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: normalizarFusoHorario(fusoHorario),
  }).format(data);
}

export default async function ProblemasImportacaoAfdPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string; arquivo?: string }>;
}) {
  await exigirPermissaoOuRedirecionar("afd:importar:global");

  const [{ id }, filtros] = await Promise.all([params, searchParams]);
  const tipo = normalizarTipo(filtros.tipo);
  const importacao = await prisma.importacaoAfd.findUnique({
    where: { id },
    include: {
      arquivos: {
        where: filtros.arquivo ? { id: filtros.arquivo } : undefined,
        orderBy: { criadoEm: "desc" },
      },
    },
  });

  if (!importacao) {
    notFound();
  }

  const arquivoIds = importacao.arquivos.map((arquivo) => arquivo.id);
  const pendencias =
    tipo === "pendentes" && arquivoIds.length > 0
      ? await prisma.marcacaoBruta.findMany({
          where: {
            arquivoAfdId: { in: arquivoIds },
            processada: false,
          },
          include: {
            arquivoAfd: {
              select: { nomeOriginal: true },
            },
          },
          orderBy: { dataHora: "desc" },
          take: 500,
        })
      : [];

  const cpfs = pendencias
    .map((item) => item.cpf)
    .filter((cpf): cpf is string => Boolean(cpf));
  const matriculas = pendencias
    .map((item) => item.matricula)
    .filter((matricula): matricula is string => Boolean(matricula));
  const servidores =
    cpfs.length > 0 || matriculas.length > 0
      ? await prisma.servidor.findMany({
          where: {
            ativo: true,
            OR: [
              ...(cpfs.length > 0 ? [{ cpf: { in: cpfs } }] : []),
              ...(matriculas.length > 0
                ? [{ matricula: { in: matriculas } }]
                : []),
            ],
          },
          include: {
            usuario: { select: { nome: true } },
            lotacoes: {
              where: {
                status: "ATIVO",
              },
              include: {
                unidade: {
                  include: {
                    orgao: {
                      select: {
                        fusoHorario: true,
                      },
                    },
                    unidadePai: {
                      include: {
                        orgao: {
                          select: {
                            fusoHorario: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: {
                dataInicio: "desc",
              },
              take: 1,
            },
          },
        })
      : [];
  const servidorPorCpf = new Map(
    servidores
      .filter((servidor) => servidor.cpf)
      .map((servidor) => [servidor.cpf, servidor]),
  );
  const servidorPorMatricula = new Map(
    servidores.map((servidor) => [servidor.matricula, servidor]),
  );
  const config = configuracaoTipo[tipo];
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Importação AFD", href: "/afd" },
          { label: importacao.id.slice(0, 8), href: `/afd/${importacao.id}` },
          { label: config.titulo },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <Icon className="size-5" aria-hidden="true" />
            <p className="text-sm font-semibold uppercase tracking-wide">
              Diagnóstico da importação AFD
            </p>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {config.titulo}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {config.descricao}
          </p>
        </div>

        <Link
          href="/afd"
          className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para importações
        </Link>
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Tipos de problema">
        {(Object.keys(configuracaoTipo) as TipoProblemaAfd[]).map((item) => {
          const href = `/afd/${importacao.id}/problemas?tipo=${item}${
            filtros.arquivo ? `&arquivo=${filtros.arquivo}` : ""
          }`;

          return (
            <Link
              key={item}
              href={href}
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                item === tipo
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "hover:bg-[var(--muted)]"
              }`}
            >
              {configuracaoTipo[item].titulo}
            </Link>
          );
        })}
      </nav>

      <section className="grid gap-4 md:grid-cols-3">
        <Resumo label="Erros" value={importacao.totalErros} />
        <Resumo label="Pendentes" value={importacao.totalPendentes} />
        <Resumo label="Duplicadas" value={importacao.totalDuplicadas} />
      </section>

      {tipo === "pendentes" ? (
        <section className="rounded-xl border bg-[var(--card)] shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-bold">Pendências identificadas</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Exibindo até 500 registros. Cadastre ou sincronize o servidor e
              depois use a ação de reprocessamento em `/afd`.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Arquivo</th>
                  <th className="px-5 py-3">Data/hora</th>
                  <th className="px-5 py-3">Identificação</th>
                  <th className="px-5 py-3">NSR</th>
                  <th className="px-5 py-3">Análise</th>
                </tr>
              </thead>
              <tbody>
                {pendencias.map((item) => {
                  const servidor =
                    (item.cpf ? servidorPorCpf.get(item.cpf) : null) ??
                    (item.matricula
                      ? servidorPorMatricula.get(item.matricula)
                      : null);
                  const analise = !item.cpf && !item.matricula
                    ? "Sem CPF ou matrícula no registro AFD."
                    : !servidor
                      ? "Servidor ativo não encontrado. Sincronize ou cadastre o servidor."
                      : `Servidor encontrado: ${nomeServidor(servidor)}. Verifique jornada vigente e período homologado.`;

                  return (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-5 py-4">
                        {item.arquivoAfd?.nomeOriginal ?? "-"}
                      </td>
                      <td className="px-5 py-4">
                        {formatarDataHora(
                          item.dataHora,
                          resolverFusoHorarioServidor(servidor),
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs">
                        <div>CPF: {item.cpf ?? "-"}</div>
                        <div>Matrícula: {item.matricula ?? "-"}</div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs">
                        {item.nsr ?? "-"}
                      </td>
                      <td className="px-5 py-4">{analise}</td>
                    </tr>
                  );
                })}
                {pendencias.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                    >
                      Nenhuma marcação pendente encontrada para o filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border bg-[var(--card)] shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-bold">Resumo por arquivo</h2>
          </div>
          <div className="divide-y">
            {importacao.arquivos.map((arquivo) => {
              const total =
                tipo === "erros"
                  ? arquivo.totalErros
                  : arquivo.totalDuplicadas;

              return (
                <article key={arquivo.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{arquivo.nomeOriginal}</h3>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        Equipamento: {arquivo.equipamentoCodigo ?? "não identificado"}
                      </p>
                    </div>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                      {total}
                    </span>
                  </div>

                  {tipo === "erros" ? (
                    <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                      {arquivo.erro ??
                        (total > 0
                          ? "Ocorreram falhas em linhas individuais, mas a versão atual do importador armazenou apenas o total."
                          : "Nenhum erro registrado neste arquivo.")}
                    </p>
                  ) : (
                    <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      {total > 0
                        ? "A marcação já existia e foi ignorada. O importador atual não persiste uma segunda cópia nem o detalhe da tentativa duplicada."
                        : "Nenhuma duplicidade registrada neste arquivo."}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Resumo({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border bg-[var(--card)] p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </article>
  );
}
