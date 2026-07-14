import Link from "next/link";
import { Edit3, Fingerprint } from "lucide-react";

import { excluirEquipamentoBiometricoAction } from "../../application/actions/excluir-equipamento-biometrico.action";
import { ExcluirEquipamentoButton } from "./excluir-equipamento-button";

type ColetaAtivaItem = {
  id: string;
  status: "AGUARDANDO" | "PROCESSANDO" | "CONCLUIDO" | "ERRO" | "CANCELADO";
  equipamentoId: string;
  atualizadoEm: string;
  progresso: {
    percentual: number;
    etapa: string;
  };
};

type StatusListenerOnline = {
  ativo: boolean;
  host: string;
  porta: number;
  iniciadoEm: Date | null;
};

type EquipamentoItem = {
  id: string;
  codigo: string;
  nome: string;
  fabricante: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  ip: string | null;
  porta: number | null;
  localizacao: string | null;
  ativo: boolean;
  orgaoId: string | null;
  unidadeId: string | null;
  ultimoHeartbeatEm: Date | null;
  ultimaSincronizacaoEm: Date | null;
  configuracao: unknown;
  estatisticasMarcacoes?: {
    marcacoesBrutas: number;
    marcacoesPendentes: number;
  };
  unidade: {
    sigla: string;
  } | null;
  orgao: {
    sigla: string;
  } | null;
  _count: {
    eventos: number;
  };
};

type EstadoOperacional = {
  label: string;
  detalhe: string;
  classe: string;
};

function getProximoNsr(configuracao: unknown) {
  if (!configuracao || typeof configuracao !== "object") {
    return "-";
  }

  const dados = configuracao as {
    proximoNsrColeta?: unknown;
    ultimoNsrColetado?: unknown;
  };

  if (dados.proximoNsrColeta) return String(dados.proximoNsrColeta);
  if (dados.ultimoNsrColetado) return String(Number(dados.ultimoNsrColetado) + 1);

  return "-";
}

function getUltimaComunicacao(equipamento: EquipamentoItem) {
  const datas = [equipamento.ultimoHeartbeatEm, equipamento.ultimaSincronizacaoEm]
    .filter((data): data is Date => Boolean(data))
    .map((data) => new Date(data));

  if (datas.length === 0) return null;

  return datas.reduce((maisRecente, atual) =>
    atual.getTime() > maisRecente.getTime() ? atual : maisRecente,
  );
}

function getOrigemUltimaComunicacao(equipamento: EquipamentoItem) {
  const heartbeat = equipamento.ultimoHeartbeatEm
    ? new Date(equipamento.ultimoHeartbeatEm).getTime()
    : 0;
  const sincronizacao = equipamento.ultimaSincronizacaoEm
    ? new Date(equipamento.ultimaSincronizacaoEm).getTime()
    : 0;

  if (!heartbeat && !sincronizacao) return "Sem comunicação";
  return heartbeat >= sincronizacao ? "Evento online/heartbeat" : "Coleta";
}

function getMinutosDesde(data: Date | null) {
  if (!data) return null;
  return (Date.now() - new Date(data).getTime()) / 60000;
}

function formatarMinutos(minutos: number) {
  if (minutos < 1) return "agora";
  if (minutos < 60) return `${Math.floor(minutos)} min atrás`;
  const horas = Math.floor(minutos / 60);
  return `${horas} h atrás`;
}

function getEstadoOperacional(
  equipamento: EquipamentoItem,
  listenerOnlineAtivo: boolean,
  coletaAtiva?: ColetaAtivaItem,
): EstadoOperacional {
  if (!equipamento.ativo) {
    return {
      label: "Inativo",
      detalhe: "Cadastro desativado",
      classe: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    };
  }

  if (coletaAtiva) {
    return {
      label: "Coletando",
      detalhe: `${coletaAtiva.progresso.percentual}% concluído`,
      classe: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    };
  }

  const ultimaComunicacao = getUltimaComunicacao(equipamento);
  const minutos = getMinutosDesde(ultimaComunicacao);

  if (minutos === null) {
    return {
      label: "Sem comunicação",
      detalhe: listenerOnlineAtivo
        ? "SECP escutando; aguardando relógio"
        : "Listener online não iniciado",
      classe: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    };
  }

  if (minutos <= 5) {
    return {
      label: "Online",
      detalhe: listenerOnlineAtivo
        ? "Comunica e SECP escuta eventos"
        : "Comunica; listener online parado",
      classe: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    };
  }

  if (minutos <= 30) {
    return {
      label: "Atrasado",
      detalhe: `Última comunicação ${formatarMinutos(minutos)}`,
      classe: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
    };
  }

  return {
    label: "Offline",
    detalhe: `Última comunicação ${formatarMinutos(minutos)}`,
    classe: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200",
  };
}

function formatarData(data: Date | null) {
  return data
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(data))
    : "-";
}

function NumeroTabela({ valor }: { valor: number }) {
  return (
    <span className="font-mono text-xs tabular-nums text-[var(--foreground)]">
      {valor.toLocaleString("pt-BR")}
    </span>
  );
}

export function EquipamentosBiometricosTable({
  equipamentos,
  coletasAtivas,
  statusListenerOnline,
  orgaoId,
}: {
  equipamentos: EquipamentoItem[];
  coletasAtivas: ColetaAtivaItem[];
  statusListenerOnline: StatusListenerOnline;
  orgaoId?: string | null;
}) {
  const coletasPorEquipamento = new Map(
    coletasAtivas.map((coleta) => [coleta.equipamentoId, coleta]),
  );
  const montarHrefEditar = (id: string) =>
    orgaoId
      ? `/equipamentos/${id}/editar?${new URLSearchParams({
          orgaoId,
        }).toString()}`
      : `/equipamentos/${id}/editar`;

  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <div className="flex items-center gap-2">
          <Fingerprint className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Equipamentos biométricos</h2>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            statusListenerOnline.ativo
              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          Eventos online:{" "}
          {statusListenerOnline.ativo
            ? `escutando ${statusListenerOnline.host}:${statusListenerOnline.porta}`
            : `parado em ${statusListenerOnline.host}:${statusListenerOnline.porta}`}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Código</th>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Orgao / Unidade</th>
              <th className="px-5 py-3">Modelo</th>
              <th className="px-5 py-3">Endpoint</th>
              <th className="px-5 py-3">NSR</th>
              <th className="px-5 py-3">Marcações brutas</th>
              <th className="px-5 py-3">Brutas pendentes</th>
              <th className="px-5 py-3">Última comunicação</th>
              <th className="px-5 py-3">Operacional</th>
              <th className="px-5 py-3">Ações</th>
            </tr>
          </thead>

          <tbody>
            {equipamentos.map((equipamento) => {
              const coletaAtiva = coletasPorEquipamento.get(equipamento.id);
              const ultimaComunicacao = getUltimaComunicacao(equipamento);
              const estado = getEstadoOperacional(
                equipamento,
                statusListenerOnline.ativo,
                coletaAtiva,
              );

              return (
                <tr key={equipamento.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-mono text-xs font-semibold">
                    {equipamento.codigo}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold">{equipamento.nome}</div>
                    {equipamento.localizacao && (
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {equipamento.localizacao}
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {equipamento.orgao?.sigla ?? "-"}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {equipamento.unidade?.sigla ?? "Sem unidade"}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {[equipamento.fabricante, equipamento.modelo]
                      .filter(Boolean)
                      .join(" / ") || "-"}
                  </td>

                  <td className="px-5 py-4 font-mono text-xs">
                    {equipamento.ip
                      ? `${equipamento.ip}:${equipamento.porta ?? 3000}`
                      : "-"}
                  </td>

                  <td className="px-5 py-4 font-mono text-xs">
                    {getProximoNsr(equipamento.configuracao)}
                  </td>

                  <td className="px-5 py-4">
                    <NumeroTabela
                      valor={equipamento.estatisticasMarcacoes?.marcacoesBrutas ?? 0}
                    />
                  </td>

                  <td className="px-5 py-4">
                    <NumeroTabela
                      valor={
                        equipamento.estatisticasMarcacoes?.marcacoesPendentes ?? 0
                      }
                    />
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-mono text-xs tabular-nums">
                      {formatarData(ultimaComunicacao)}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {getOrigemUltimaComunicacao(equipamento)}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${estado.classe}`}
                      >
                        {estado.label}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {estado.detalhe}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={montarHrefEditar(equipamento.id)}
                        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-[var(--muted)]"
                      >
                        <Edit3 className="size-3.5" />
                        Editar
                      </Link>
                      <form action={excluirEquipamentoBiometricoAction}>
                        <input
                          type="hidden"
                          name="equipamentoId"
                          value={equipamento.id}
                        />
                        {orgaoId && (
                          <input type="hidden" name="orgaoId" value={orgaoId} />
                        )}
                        <ExcluirEquipamentoButton nome={equipamento.nome} />
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}

            {equipamentos.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhum equipamento biométrico cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
