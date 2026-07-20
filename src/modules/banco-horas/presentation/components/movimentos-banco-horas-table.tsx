import { Trash2 } from "lucide-react";

import { excluirAjusteManualBancoHorasAction } from "../../application/actions/excluir-ajuste-manual-banco-horas.action";
import {
  formatarDataCivilBancoHoras,
  minutosParaHoraBanco,
  rotuloOrigemMovimentoBancoHoras,
  rotuloSituacaoLoteBancoHoras,
  rotuloStatusMovimentoBancoHoras,
  rotuloTipoMovimentoBancoHoras,
} from "../../application/services/formatar-banco-horas.service";

type MovimentoBancoHorasItem = {
  id: string;
  dataReferencia: Date;
  tipo: string;
  origem: string;
  status: string;
  minutos: number;
  descricao: string | null;
  expiraEm: Date | null;
  metadados?: unknown;
};

function metadadosComoObjeto(metadados: unknown) {
  if (!metadados || typeof metadados !== "object" || Array.isArray(metadados)) {
    return {};
  }

  return metadados as Record<string, unknown>;
}

function fifoDoMovimento(metadados: unknown) {
  const fifo = metadadosComoObjeto(metadadosComoObjeto(metadados).fifo);

  return {
    situacao: typeof fifo.situacao === "string" ? fifo.situacao : null,
    minutosOriginais: Number(fifo.minutosOriginais ?? 0),
    minutosUtilizados: Number(fifo.minutosUtilizados ?? 0),
    minutosRestantes: Number(fifo.minutosRestantes ?? 0),
    alocacoes: Array.isArray(fifo.alocacoes) ? fifo.alocacoes.length : 0,
  };
}

function regraDoMovimento(metadados: unknown) {
  const regra = metadadosComoObjeto(
    metadadosComoObjeto(metadados).regraBancoHoras,
  );

  return {
    fundamento:
      typeof regra.fundamento === "string" ? regra.fundamento : null,
    alertas: Array.isArray(regra.alertas)
      ? regra.alertas.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function classeStatus(status: string) {
  if (status === "VALIDADO") {
    return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
  }

  if (status === "PENDENTE") {
    return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
  }

  if (status === "DESCONSIDERADO") {
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }

  return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
}

function DetalheFifo({ metadados }: { metadados?: unknown }) {
  const fifo = fifoDoMovimento(metadados);

  if (fifo.alocacoes > 0) {
    return (
      <span className="inline-flex rounded-full border px-2 py-1 font-semibold">
        {fifo.alocacoes} lote{fifo.alocacoes === 1 ? "" : "s"}
      </span>
    );
  }

  if (!fifo.situacao) {
    return <span>-</span>;
  }

  return (
    <div className="space-y-1">
      <span className="inline-flex rounded-full border px-2 py-1 font-semibold">
        {rotuloSituacaoLoteBancoHoras(fifo.situacao)}
      </span>
      <p>
        Restante: {minutosParaHoraBanco(fifo.minutosRestantes)} de{" "}
        {minutosParaHoraBanco(fifo.minutosOriginais)}
      </p>
      {fifo.minutosUtilizados > 0 ? (
        <p>Utilizado: {minutosParaHoraBanco(fifo.minutosUtilizados)}</p>
      ) : null}
    </div>
  );
}

function DetalheRegraBancoHoras({ metadados }: { metadados?: unknown }) {
  const regra = regraDoMovimento(metadados);

  if (!regra.fundamento && regra.alertas.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 text-xs">
      {regra.fundamento ? (
        <p className="text-[var(--muted-foreground)]">{regra.fundamento}</p>
      ) : null}
      {regra.alertas.map((alerta) => (
        <p key={alerta} className="font-semibold text-amber-700 dark:text-amber-300">
          {alerta}
        </p>
      ))}
    </div>
  );
}

export function MovimentosBancoHorasTable({
  movimentos,
  podeGerenciar = false,
}: {
  movimentos: MovimentoBancoHorasItem[];
  podeGerenciar?: boolean;
}) {
  const colSpan = podeGerenciar ? 9 : 8;

  return (
    <section className="rounded-lg border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b p-4 md:flex-row md:items-start">
        <div>
          <h2 className="text-base font-bold">Extrato da competência</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Créditos, débitos, compensações, prazos e fundamentos registrados
            para o mês selecionado.
          </p>
        </div>

        <span className="inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
          {movimentos.length} registro{movimentos.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] text-left text-sm">
          <caption className="sr-only">
            Movimentos do banco de horas com data, tipo, origem, horas, status,
            expiração, lote e descrição.
          </caption>
          <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Horas</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expiração</th>
              <th className="px-4 py-3">Lote</th>
              <th className="px-4 py-3">Descrição</th>
              {podeGerenciar && <th className="px-4 py-3">Ações</th>}
            </tr>
          </thead>

          <tbody>
            {movimentos.map((movimento) => (
              <tr key={movimento.id} className="border-b align-top last:border-b-0">
                <td className="px-4 py-3">
                  {formatarDataCivilBancoHoras(movimento.dataReferencia)}
                </td>

                <td className="px-4 py-3 font-semibold">
                  {rotuloTipoMovimentoBancoHoras(movimento.tipo)}
                </td>

                <td className="px-4 py-3">
                  {rotuloOrigemMovimentoBancoHoras(movimento.origem)}
                </td>

                <td className="px-4 py-3 font-mono font-semibold">
                  {minutosParaHoraBanco(movimento.minutos)}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${classeStatus(
                      movimento.status,
                    )}`}
                  >
                    {rotuloStatusMovimentoBancoHoras(movimento.status)}
                  </span>
                </td>

                <td className="px-4 py-3">
                  {movimento.expiraEm
                    ? formatarDataCivilBancoHoras(movimento.expiraEm)
                    : "-"}
                </td>

                <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                  <DetalheFifo metadados={movimento.metadados} />
                </td>

                <td className="px-4 py-3 text-[var(--muted-foreground)]">
                  <div className="max-w-[420px] space-y-1">
                    <p>{movimento.descricao ?? "-"}</p>
                    <DetalheRegraBancoHoras metadados={movimento.metadados} />
                  </div>
                </td>

                {podeGerenciar && (
                  <td className="px-4 py-3">
                    {movimentoPodeSerExcluido(movimento) ? (
                      <form action={excluirAjusteManualBancoHorasAction}>
                        <input
                          type="hidden"
                          name="movimentoId"
                          value={movimento.id}
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Excluir
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        -
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}

            {movimentos.length === 0 && (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhum movimento de banco de horas encontrado para a
                  competência selecionada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function movimentoPodeSerExcluido(movimento: MovimentoBancoHorasItem) {
  return (
    movimento.origem === "AJUSTE_ADMINISTRATIVO" &&
    !["ESTORNADO", "DESCONSIDERADO", "EXPIRADO"].includes(movimento.status)
  );
}
