import Link from "next/link";
import {
  Check,
  Clock3,
  FileCheck2,
  FileClock,
  FileX2,
  Filter,
  type LucideIcon,
} from "lucide-react";
import {
  classeStatusSolicitacao,
  rotuloStatusSolicitacao,
  rotuloTipoSolicitacao,
} from "../../application/services/fluxo-solicitacao.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

type SolicitacaoItem = {
  id: string;
  tipo: string;
  status: string;
  titulo: string;
  criadoEm: Date;
  dataReferencia: Date | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  servidor: {
    matricula: string;
    nomeFuncional?: string | null;
    usuario: {
      nome: string;
    };
  };
  unidade: {
    sigla: string;
  } | null;
};

function formatarData(data: Date | null) {
  if (!data) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(data);
}

function formatarPeriodo(solicitacao: SolicitacaoItem) {
  if (solicitacao.dataReferencia) {
    return formatarData(solicitacao.dataReferencia);
  }

  const inicio = formatarData(solicitacao.dataInicio);
  const fim = formatarData(solicitacao.dataFim);

  if (inicio && fim) {
    return inicio === fim ? inicio : `${inicio} a ${fim}`;
  }

  return inicio ?? "-";
}

function contarStatus(solicitacoes: SolicitacaoItem[]) {
  return solicitacoes.reduce(
    (acc, solicitacao) => {
      if (["ENVIADA", "EM_ANALISE"].includes(solicitacao.status)) {
        acc.pendentes += 1;
      } else if (solicitacao.status === "DEFERIDA") {
        acc.deferidas += 1;
      } else if (solicitacao.status === "INDEFERIDA") {
        acc.indeferidas += 1;
      }

      return acc;
    },
    {
      pendentes: 0,
      deferidas: 0,
      indeferidas: 0,
    },
  );
}

function contarPorTipo(solicitacoes: SolicitacaoItem[]) {
  return solicitacoes.reduce((acc, solicitacao) => {
    acc.set(solicitacao.tipo, (acc.get(solicitacao.tipo) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
}

function ResumoItem({
  icon: Icon,
  label,
  valor,
}: {
  icon: LucideIcon;
  label: string;
  valor: number;
}) {
  return (
    <div className="rounded-lg border bg-[var(--card)] p-4">
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold">{valor}</p>
    </div>
  );
}

export function SolicitacoesTable({
  solicitacoes,
  tipoSelecionado,
}: {
  solicitacoes: SolicitacaoItem[];
  tipoSelecionado?: string;
}) {
  const tipoAtivo = solicitacoes.some(
    (solicitacao) => solicitacao.tipo === tipoSelecionado,
  )
    ? tipoSelecionado
    : undefined;
  const solicitacoesFiltradas = tipoAtivo
    ? solicitacoes.filter((solicitacao) => solicitacao.tipo === tipoAtivo)
    : solicitacoes;
  const resumo = contarStatus(solicitacoesFiltradas);
  const contagemPorTipo = contarPorTipo(solicitacoes);
  const tipos = Array.from(contagemPorTipo.keys()).sort((a, b) =>
    rotuloTipoSolicitacao(a).localeCompare(rotuloTipoSolicitacao(b), "pt-BR"),
  );

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <ResumoItem
          icon={Clock3}
          label="Total"
          valor={solicitacoesFiltradas.length}
        />
        <ResumoItem icon={FileClock} label="Pendentes" valor={resumo.pendentes} />
        <ResumoItem icon={FileCheck2} label="Deferidas" valor={resumo.deferidas} />
        <ResumoItem icon={FileX2} label="Indeferidas" valor={resumo.indeferidas} />
      </div>

      <div className="rounded-lg border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-bold">Solicitacoes registradas</h2>
            {tipoAtivo ? (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Filtrando por {rotuloTipoSolicitacao(tipoAtivo)}.
              </p>
            ) : null}
          </div>

          <details className="relative self-start">
            <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)] [&::-webkit-details-marker]:hidden">
              <Filter className="size-4" aria-hidden="true" />
              Filtrar tipo
            </summary>

            <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border bg-[var(--card)] p-2 shadow-lg">
              <Link
                href="/solicitacoes"
                className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-semibold hover:bg-[var(--muted)]"
              >
                <span>Todos os tipos</span>
                {!tipoAtivo ? <Check className="size-4" aria-hidden="true" /> : null}
              </Link>

              {tipos.map((tipo) => {
                const ativo = tipoAtivo === tipo;
                const query = new URLSearchParams({ tipo });

                return (
                  <Link
                    key={tipo}
                    href={`/solicitacoes?${query.toString()}`}
                    className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-[var(--muted)]"
                  >
                    <span>{rotuloTipoSolicitacao(tipo)}</span>
                    <span className="flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)]">
                      {contagemPorTipo.get(tipo) ?? 0}
                      {ativo ? <Check className="size-4" aria-hidden="true" /> : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          </details>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Criada em</th>
                <th className="px-5 py-3">Referencia</th>
                <th className="px-5 py-3">Servidor</th>
                <th className="px-5 py-3">Unidade</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Titulo</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Acoes</th>
              </tr>
            </thead>

            <tbody>
              {solicitacoesFiltradas.map((solicitacao) => (
                <tr key={solicitacao.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4">
                    {new Intl.DateTimeFormat("pt-BR").format(
                      solicitacao.criadoEm,
                    )}
                  </td>

                  <td className="px-5 py-4 font-medium">
                    {formatarPeriodo(solicitacao)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {nomeServidor(solicitacao.servidor)}
                    </div>
                    <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                      {solicitacao.servidor.matricula}
                    </div>
                  </td>

                  <td className="px-5 py-4">{solicitacao.unidade?.sigla ?? "-"}</td>

                  <td className="px-5 py-4">
                    {rotuloTipoSolicitacao(solicitacao.tipo)}
                  </td>

                  <td className="px-5 py-4">
                    <span className="line-clamp-2">{solicitacao.titulo}</span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${classeStatusSolicitacao(
                        solicitacao.status,
                      )}`}
                    >
                      {rotuloStatusSolicitacao(solicitacao.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/solicitacoes/${solicitacao.id}`}
                      className="text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                    >
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {solicitacoesFiltradas.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhuma solicitacao encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
