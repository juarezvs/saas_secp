import { OrigemMarcacaoIcon } from "@/modules/marcacoes/presentation/components/origem-marcacao-icon";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { normalizarFusoHorario } from "@/modules/marcacoes/application/services/data-marcacao.service";

type MarcacaoBrutaItem = {
  id: string;
  cpf: string | null;
  matricula: string | null;
  dataHora: Date | string | null;
  equipamentoCodigo: string | null;
  origem: string;
  nsr: string | null;
  codigoExterno: string | null;
  processada: boolean;
  processadaEm: Date | null;
  payloadOriginal?: unknown;
  arquivoAfd?: {
    nomeOriginal: string;
  } | null;
  equipamento?: {
    codigo: string;
    nome: string;
    numeroSerie: string | null;
  } | null;
  servidor: {
    matricula: string;
    nomeFuncional?: string | null;
    usuario: {
      nome: string;
    };
  } | null;
  marcacao: {
    tipo: string;
    status: string;
    fusoHorario?: string | null;
  } | null;
};

function formatarDataHoraSegura(
  valor: Date | string | null | undefined,
  fusoHorario?: string | null,
) {
  if (!valor) {
    return "-";
  }

  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: normalizarFusoHorario(fusoHorario),
  }).format(data);
}

function normalizarCpf(valor: string | null | undefined) {
  const digitos = (valor ?? "").replace(/\D/g, "");

  if (digitos.length === 12 && digitos.startsWith("0")) {
    return digitos.slice(1);
  }

  return digitos.length === 11 ? digitos : null;
}

function extrairCpfDePayload(valor: unknown): string | null {
  if (!valor) {
    return null;
  }

  if (typeof valor === "string") {
    const cpfAfdTipo3 =
      valor.length >= 46 && valor.slice(9, 10) === "3"
        ? normalizarCpf(valor.slice(34, 46))
        : null;

    if (cpfAfdTipo3) {
      return cpfAfdTipo3;
    }

    const candidato = valor.match(/(^|\D)(0?\d{11})(\D|$)/)?.[2];
    return normalizarCpf(candidato);
  }

  if (Array.isArray(valor)) {
    for (const item of valor) {
      const cpf = extrairCpfDePayload(item);

      if (cpf) {
        return cpf;
      }
    }

    return null;
  }

  if (typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;

    for (const [chave, item] of Object.entries(objeto)) {
      if (chave.toLocaleLowerCase("pt-BR") === "cpf") {
        const cpf = normalizarCpf(String(item ?? ""));

        if (cpf) {
          return cpf;
        }
      }
    }

    for (const item of Object.values(objeto)) {
      const cpf = extrairCpfDePayload(item);

      if (cpf) {
        return cpf;
      }
    }
  }

  return null;
}

function cpfExibicao(item: MarcacaoBrutaItem) {
  return normalizarCpf(item.cpf) ?? extrairCpfDePayload(item.payloadOriginal);
}

function objetoPayload(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function origemWebDoPayload(valor: unknown) {
  const payload = objetoPayload(valor);
  const origem = objetoPayload(payload?.equipamentoOrigem);

  if (!origem) {
    return null;
  }

  return {
    nome: typeof origem.nome === "string" ? origem.nome : null,
    ip: typeof origem.ip === "string" ? origem.ip : null,
    nomeMaquina:
      typeof origem.nomeMaquina === "string" ? origem.nomeMaquina : null,
    userAgent: typeof origem.userAgent === "string" ? origem.userAgent : null,
  };
}

export function MarcacoesBrutasTable({
  marcacoes,
}: {
  marcacoes: MarcacaoBrutaItem[];
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Marcações brutas</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Fonte oficial e imutável das marcações recebidas pelo SECP.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Data/hora</th>
              <th className="px-5 py-3">Origem</th>
              <th className="px-5 py-3">CPF/Matrícula</th>
              <th className="px-5 py-3">Servidor vinculado</th>
              <th className="px-5 py-3">Equipamento</th>
              <th className="px-5 py-3">NSR/Código</th>
              <th className="px-5 py-3">Processamento</th>
              <th className="px-5 py-3">Marcação</th>
            </tr>
          </thead>

          <tbody>
            {marcacoes.map((item) => {
              const cpf = cpfExibicao(item);
              const origemWeb = origemWebDoPayload(item.payloadOriginal);

              return (
              <tr key={item.id} className="border-b last:border-b-0">
                <td className="px-5 py-4">
                  {formatarDataHoraSegura(
                    item.dataHora,
                    item.marcacao?.fusoHorario,
                  )}
                </td>

                <td className="px-5 py-4">
                  <OrigemMarcacaoIcon origem={item.origem} />
                  {item.arquivoAfd && (
                    <div className="mt-2 max-w-60 truncate text-xs text-(--muted-foreground)">
                      {item.arquivoAfd.nomeOriginal}
                    </div>
                  )}
                </td>

                <td className="px-5 py-4 font-mono text-xs">
                  <div>CPF: {cpf ?? "-"}</div>
                  <div>Matrícula: {item.matricula ?? "-"}</div>
                </td>

                <td className="px-5 py-4">
                  {item.servidor ? (
                    <>
                      <div className="font-semibold">
                        {nomeServidor(item.servidor)}
                      </div>
                      <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                        {item.servidor.matricula}
                      </div>
                    </>
                  ) : (
                    <span className="text-[var(--muted-foreground)]">
                      Não vinculado
                    </span>
                  )}
                </td>

                <td className="px-5 py-4 font-mono text-xs">
                  {item.equipamento ? (
                    <div className="space-y-1">
                      <div className="font-semibold">{item.equipamento.codigo}</div>
                      <div className="font-sans text-[var(--muted-foreground)]">
                        {item.equipamento.nome}
                      </div>
                      {item.equipamento.numeroSerie && (
                        <div className="text-[var(--muted-foreground)]">
                          Serial: {item.equipamento.numeroSerie}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="font-semibold">
                        {item.equipamentoCodigo ?? origemWeb?.nome ?? "-"}
                      </div>
                      {origemWeb?.ip ? (
                        <div className="font-sans text-[var(--muted-foreground)]">
                          IP: {origemWeb.ip}
                        </div>
                      ) : null}
                      {origemWeb?.nomeMaquina ? (
                        <div className="font-sans text-[var(--muted-foreground)]">
                          Máquina: {origemWeb.nomeMaquina}
                        </div>
                      ) : null}
                      {origemWeb?.userAgent ? (
                        <div className="max-w-56 truncate font-sans text-[var(--muted-foreground)]">
                          {origemWeb.userAgent}
                        </div>
                      ) : null}
                    </div>
                  )}
                </td>

                <td className="px-5 py-4 font-mono text-xs">
                  <div>NSR: {item.nsr ?? "-"}</div>
                  <div>Código: {item.codigoExterno ?? "-"}</div>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      item.processada
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                    }`}
                  >
                    {item.processada ? "Processada" : "Pendente"}
                  </span>
                </td>

                <td className="px-5 py-4">
                  {item.marcacao ? (
                    <>
                      <div className="font-semibold">{item.marcacao.tipo}</div>
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {item.marcacao.status}
                      </div>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
              );
            })}

            {marcacoes.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhuma marcação bruta encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
