import Link from "next/link";
import {
  formatarDataHoraAuditoria,
  rotuloEntidadeAuditoria,
} from "../../application/services/formatar-auditoria.service";

type AuditoriaEventoItem = {
  id: string;
  entidade: string;
  entidadeId: string | null;
  acao: string;
  criadoEm: Date;
  ip: string | null;
  usuario: {
    nome: string;
    matricula: string;
  } | null;
};

type AuditoriaTableProps = {
  eventos: AuditoriaEventoItem[];
  paginacao: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
  queryStringBase: string;
};

function montarHrefPagina(queryStringBase: string, pagina: number) {
  const params = new URLSearchParams(queryStringBase);
  params.set("pagina", String(pagina));
  return `/auditoria?${params.toString()}`;
}

export function AuditoriaTable({
  eventos,
  paginacao,
  queryStringBase,
}: AuditoriaTableProps) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b p-5 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-bold">Eventos de auditoria</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {paginacao.total} evento(s) encontrado(s).
          </p>
        </div>

        <p className="text-sm text-[var(--muted-foreground)]">
          Página {paginacao.pagina} de {paginacao.totalPaginas}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Data/hora</th>
              <th className="px-5 py-3">Usuário</th>
              <th className="px-5 py-3">Entidade</th>
              <th className="px-5 py-3">ID entidade</th>
              <th className="px-5 py-3">Ação</th>
              <th className="px-5 py-3">IP</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {eventos.map((evento) => (
              <tr key={evento.id} className="border-b last:border-b-0">
                <td className="px-5 py-4">
                  {formatarDataHoraAuditoria(evento.criadoEm)}
                </td>

                <td className="px-5 py-4">
                  {evento.usuario ? (
                    <>
                      <div className="font-semibold">{evento.usuario.nome}</div>
                      <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                        {evento.usuario.matricula}
                      </div>
                    </>
                  ) : (
                    <span className="text-[var(--muted-foreground)]">
                      Sistema/sem usuário
                    </span>
                  )}
                </td>

                <td className="px-5 py-4">
                  {rotuloEntidadeAuditoria(evento.entidade)}
                </td>

                <td className="px-5 py-4 font-mono text-xs">
                  {evento.entidadeId ?? "-"}
                </td>

                <td className="px-5 py-4">
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                    {evento.acao}
                  </span>
                </td>

                <td className="px-5 py-4 font-mono text-xs">
                  {evento.ip ?? "-"}
                </td>

                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/auditoria/${evento.id}`}
                    className="text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                  >
                    Detalhar
                  </Link>
                </td>
              </tr>
            ))}

            {eventos.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhum evento de auditoria encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col justify-between gap-3 border-t p-5 md:flex-row md:items-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          Exibindo até {paginacao.limite} registros por página.
        </p>

        <div className="flex gap-2">
          <Link
            href={montarHrefPagina(
              queryStringBase,
              Math.max(1, paginacao.pagina - 1),
            )}
            aria-disabled={paginacao.pagina <= 1}
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              paginacao.pagina <= 1
                ? "pointer-events-none opacity-50"
                : "hover:bg-[var(--muted)]"
            }`}
          >
            Anterior
          </Link>

          <Link
            href={montarHrefPagina(
              queryStringBase,
              Math.min(paginacao.totalPaginas, paginacao.pagina + 1),
            )}
            aria-disabled={paginacao.pagina >= paginacao.totalPaginas}
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              paginacao.pagina >= paginacao.totalPaginas
                ? "pointer-events-none opacity-50"
                : "hover:bg-[var(--muted)]"
            }`}
          >
            Próxima
          </Link>
        </div>
      </div>
    </section>
  );
}
