import Link from "next/link";
import { Clock3, FileCheck2, FileClock, FileX2, type LucideIcon } from "lucide-react";
import {
  classeStatusSolicitacao,
  rotuloStatusSolicitacao,
  rotuloTipoSolicitacao,
} from "../../application/services/fluxo-solicitacao.service";

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
}: {
  solicitacoes: SolicitacaoItem[];
}) {
  const resumo = contarStatus(solicitacoes);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <ResumoItem icon={Clock3} label="Total" valor={solicitacoes.length} />
        <ResumoItem icon={FileClock} label="Pendentes" valor={resumo.pendentes} />
        <ResumoItem icon={FileCheck2} label="Deferidas" valor={resumo.deferidas} />
        <ResumoItem icon={FileX2} label="Indeferidas" valor={resumo.indeferidas} />
      </div>

      <div className="rounded-lg border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-bold">Solicitacoes registradas</h2>
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
              {solicitacoes.map((solicitacao) => (
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
                      {solicitacao.servidor.usuario.nome}
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

              {solicitacoes.length === 0 && (
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
