import Link from "next/link";

import { ConvocadoRecessoForm } from "./convocado-recesso-form";
import { RecessoStatusBadge } from "./recesso-status-badge";
import { convocarServidorRecessoEmLoteAction } from "../../application/actions/recesso-forense.actions";
import { formatarDataRecesso } from "../../application/services/recesso-forense.service";

type ServidorOption = {
  id: string;
  matricula: string;
  usuario: {
    nome: string;
  };
};

type ConvocacoesRecessoPanelProps = {
  recesso: {
    id: string;
    ano: number;
    dataInicio: Date;
    dataFim: Date;
    convocacoes: Array<{
      id: string;
      numeroPortaria: string;
      dataPortaria: Date | null;
      status: string;
      unidade: { sigla: string; nome: string } | null;
      chefiaResponsavel: { usuario: { nome: string } } | null;
      convocados: Array<{
        id: string;
        dataConvocacao: Date;
        escolha: string;
        status: string;
        servidor: {
          id: string;
          matricula: string;
          usuario: { nome: string };
          lotacoes: Array<{ unidade: { sigla: string } }>;
        };
      }>;
    }>;
  };
  servidores: ServidorOption[];
  edicao?: {
    convocacaoId?: string;
    servidorId?: string;
  };
};

function agruparConvocadosPorServidor(
  convocados: ConvocacoesRecessoPanelProps["recesso"]["convocacoes"][number]["convocados"],
) {
  const grupos = new Map<
    string,
    {
      servidorId: string;
      nome: string;
      matricula: string;
      unidade: string;
      pecunia: Date[];
      folga: Date[];
      statuses: string[];
      dias: Array<{ dataConvocacao: Date; escolha: "PECUNIA" | "FOLGA" }>;
    }
  >();

  convocados.forEach((item) => {
    const servidorId = item.servidor.id;
    const grupo =
      grupos.get(servidorId) ??
      {
        servidorId,
        nome: item.servidor.usuario.nome,
        matricula: item.servidor.matricula,
        unidade: item.servidor.lotacoes[0]?.unidade.sigla ?? "-",
        pecunia: [],
        folga: [],
        statuses: [],
        dias: [],
      };

    if (item.escolha === "FOLGA") {
      grupo.folga.push(item.dataConvocacao);
    } else {
      grupo.pecunia.push(item.dataConvocacao);
    }

    grupo.statuses.push(item.status);
    grupo.dias.push({
      dataConvocacao: item.dataConvocacao,
      escolha: item.escolha === "FOLGA" ? "FOLGA" : "PECUNIA",
    });
    grupos.set(servidorId, grupo);
  });

  return Array.from(grupos.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

function formatarDatas(datas: Date[]) {
  if (datas.length === 0) {
    return "-";
  }

  return datas
    .sort((a, b) => a.getTime() - b.getTime())
    .map((data) => formatarDataRecesso(data))
    .join(", ");
}

function statusConsolidado(statuses: string[]) {
  const unicos = Array.from(new Set(statuses));
  return unicos.length === 1 ? unicos[0] : "MISTO";
}

export function ConvocacoesRecessoPanel({
  recesso,
  servidores,
  edicao,
}: ConvocacoesRecessoPanelProps) {
  return (
    <div className="space-y-6">
      {recesso.convocacoes.map((convocacao) => {
        const convocadosAgrupados = agruparConvocadosPorServidor(convocacao.convocados);
        const servidorEmEdicao =
          edicao?.convocacaoId === convocacao.id
            ? convocadosAgrupados.find((item) => item.servidorId === edicao.servidorId)
            : undefined;

        return (
        <section
          key={convocacao.id}
          className="rounded-xl border bg-[var(--card)] shadow-sm"
        >
          <div className="border-b p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <h2 className="text-lg font-bold">
                  Portaria {convocacao.numeroPortaria}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {convocacao.dataPortaria
                    ? formatarDataRecesso(convocacao.dataPortaria)
                    : "Sem data"}{" "}
                  - {convocacao.unidade?.sigla ?? "Unidade nao informada"} -
                  Chefia:{" "}
                  {convocacao.chefiaResponsavel?.usuario.nome ??
                    "nao definida"}
                </p>
              </div>
              <RecessoStatusBadge status={convocacao.status} />
            </div>
          </div>

          <div className="p-5">
            <ConvocadoRecessoForm
              key={`${convocacao.id}-${servidorEmEdicao?.servidorId ?? "novo"}`}
              recessoId={recesso.id}
              convocacaoId={convocacao.id}
              anoRecesso={recesso.ano}
              dataInicio={recesso.dataInicio}
              dataFim={recesso.dataFim}
              servidores={servidores}
              servidorIdInicial={servidorEmEdicao?.servidorId}
              diasIniciais={servidorEmEdicao?.dias}
              action={convocarServidorRecessoEmLoteAction}
            />
          </div>

          <div className="overflow-x-auto border-t">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Servidor</th>
                  <th className="px-5 py-3">Unidade</th>
                  <th className="px-5 py-3">Pecunia</th>
                  <th className="px-5 py-3">Folga</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {convocadosAgrupados.map((item) => (
                  <tr key={item.servidorId} className="border-b last:border-b-0">
                    <td className="px-5 py-4">
                      <div className="font-semibold">{item.nome}</div>
                      <div className="font-mono text-xs text-[var(--muted-foreground)]">
                        {item.matricula}
                      </div>
                    </td>
                    <td className="px-5 py-4">{item.unidade}</td>
                    <td className="max-w-[260px] px-5 py-4 text-[var(--muted-foreground)]">
                      {formatarDatas(item.pecunia)}
                    </td>
                    <td className="max-w-[260px] px-5 py-4 text-[var(--muted-foreground)]">
                      {formatarDatas(item.folga)}
                    </td>
                    <td className="px-5 py-4">
                      <RecessoStatusBadge status={statusConsolidado(item.statuses)} />
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/recesso-forense/${recesso.id}/convocacoes?convocacao=${convocacao.id}&servidor=${item.servidorId}#convocado-form-${convocacao.id}`}
                        className="inline-flex rounded-md border px-3 py-1.5 text-xs font-semibold text-blue-900 transition hover:bg-[var(--muted)] dark:text-blue-300"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
                {convocadosAgrupados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[var(--muted-foreground)]">
                      Nenhum servidor convocado nesta portaria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        );
      })}
    </div>
  );
}
