import Link from "next/link";
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

export function SolicitacoesTable({
  solicitacoes,
}: {
  solicitacoes: SolicitacaoItem[];
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Solicitações</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Servidor</th>
              <th className="px-5 py-3">Unidade</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Título</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {solicitacoes.map((solicitacao) => (
              <tr key={solicitacao.id} className="border-b last:border-b-0">
                <td className="px-5 py-4">
                  {new Intl.DateTimeFormat("pt-BR").format(
                    solicitacao.criadoEm
                  )}
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

                <td className="px-5 py-4">{solicitacao.titulo}</td>

                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${classeStatusSolicitacao(
                      solicitacao.status
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
                  colSpan={7}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhuma solicitação encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}