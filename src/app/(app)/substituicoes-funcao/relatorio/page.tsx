import { Search, UserRoundCheck } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { SearchableSelect } from "@/components/ui";
import {
  obterEscopoOrgaoDaSessao,
  whereOrgaoPermitido,
} from "@/modules/auth/application/services/escopo-orgao.service";
import {
  exigirUmaDasPermissoesOuRedirecionar,
  possuiPermissaoNaLista,
} from "@/modules/auth/application/services/permissao.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import {
  RelatorioSubstituicoesExport,
  type RelatorioSubstituicaoItem,
} from "@/modules/substituicoes-funcao/presentation/components/relatorio-substituicoes-export";
import { prisma } from "@/shared/infrastructure/database/prisma";

const PERMISSOES_RELATORIO = [
  "substituicoes-funcao:relatorio:proprio",
  "substituicoes-funcao:relatorio:subordinados",
  "substituicoes-funcao:relatorio:seccional",
  "substituicoes-funcao:relatorio:global",
];

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function valorParametro(
  params: Record<string, string | string[] | undefined>,
  chave: string,
) {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}

function dataUtc(valor: string | undefined, fallback: Date) {
  if (!valor) return fallback;
  const [ano, mes, dia] = valor.split("-").map(Number);
  if (!ano || !mes || !dia) return fallback;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function formatarData(data?: Date | null) {
  return data
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data)
    : "-";
}

function isoData(data: Date) {
  return data.toISOString().slice(0, 10);
}

function maxData(a: Date, b: Date) {
  return a.getTime() > b.getTime() ? a : b;
}

function minData(a: Date, b: Date) {
  return a.getTime() < b.getTime() ? a : b;
}

function datasEntre(inicio: Date, fim: Date) {
  const datas: string[] = [];
  const cursor = new Date(inicio);

  while (cursor.getTime() <= fim.getTime()) {
    datas.push(formatarData(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return datas;
}

function nomeServidor(servidor: {
  nomeFuncional: string | null;
  nomeCompletoSarh?: string | null;
  usuario: { nome: string };
}) {
  return servidor.nomeFuncional ?? servidor.nomeCompletoSarh ?? servidor.usuario.nome;
}

export default async function RelatorioSubstituicoesFuncaoPage({
  searchParams,
}: PageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar(PERMISSOES_RELATORIO);
  const escopo = await obterEscopoOrgaoDaSessao();
  const params = (await searchParams) ?? {};
  const hoje = new Date();
  const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
  const fimMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0));
  const dataInicio = dataUtc(valorParametro(params, "dataInicio"), inicioMes);
  const dataFim = dataUtc(valorParametro(params, "dataFim"), fimMes);
  const servidorId = valorParametro(params, "servidorId") ?? "";
  const podeGlobal = possuiPermissaoNaLista(
    permissao.permissoes,
    "substituicoes-funcao:relatorio:global",
  );
  const podeSeccional = possuiPermissaoNaLista(
    permissao.permissoes,
    "substituicoes-funcao:relatorio:seccional",
  );
  const podeSubordinados = possuiPermissaoNaLista(
    permissao.permissoes,
    "substituicoes-funcao:relatorio:subordinados",
  );
  const podeProprio = possuiPermissaoNaLista(
    permissao.permissoes,
    "substituicoes-funcao:relatorio:proprio",
  );
  const unidadeIdsSubordinadas =
    podeSubordinados && permissao.usuarioId
      ? await listarIdsUnidadesSubordinadasPorUsuario(permissao.usuarioId)
      : [];
  const podeEscolherServidor =
    podeGlobal || podeSeccional || unidadeIdsSubordinadas.length > 0;
  const servidorAtual = permissao.usuarioId
    ? await prisma.servidor.findFirst({
        where: { usuarioId: permissao.usuarioId, ativo: true },
        select: { id: true },
      })
    : null;

  const condicoesAcesso = [];

  if (podeGlobal || podeSeccional) {
    condicoesAcesso.push({ orgao: whereOrgaoPermitido(escopo) });
  }

  if (unidadeIdsSubordinadas.length > 0) {
    condicoesAcesso.push({
      substitutoServidor: {
        lotacoes: {
          some: {
            status: "ATIVO" as const,
            unidadeId: { in: unidadeIdsSubordinadas },
          },
        },
      },
    });
  }

  if (podeProprio && servidorAtual) {
    condicoesAcesso.push({ substitutoServidorId: servidorAtual.id });
  }

  const servidores = podeEscolherServidor
    ? await prisma.servidor.findMany({
        where: {
          ativo: true,
          usuario: { ativo: true, tipo: "SERVIDOR" },
          OR: [
            ...(podeGlobal || podeSeccional
              ? [{ orgao: whereOrgaoPermitido(escopo) }]
              : []),
            ...(unidadeIdsSubordinadas.length > 0
              ? [
                  {
                    lotacoes: {
                      some: {
                        status: "ATIVO" as const,
                        unidadeId: { in: unidadeIdsSubordinadas },
                      },
                    },
                  },
                ]
              : []),
          ],
        },
        select: {
          id: true,
          matricula: true,
          nomeFuncional: true,
          nomeCompletoSarh: true,
          usuario: { select: { nome: true } },
          orgao: { select: { sigla: true } },
        },
        orderBy: [{ matricula: "asc" }],
        take: 1000,
      })
    : [];

  const substituicoes = await prisma.substituicaoFuncao.findMany({
    where: {
      dataInicio: { lte: dataFim },
      OR: [{ dataFim: null }, { dataFim: { gte: dataInicio } }],
      ...(servidorId && podeEscolherServidor
        ? { substitutoServidorId: servidorId }
        : {}),
      ...(condicoesAcesso.length > 0 ? { AND: [{ OR: condicoesAcesso }] } : {}),
    },
    include: {
      orgao: { select: { sigla: true } },
      unidade: { select: { sigla: true, nome: true } },
      titularServidor: {
        select: {
          id: true,
          matricula: true,
          nomeFuncional: true,
          nomeCompletoSarh: true,
          usuario: { select: { nome: true } },
        },
      },
      substitutoServidor: {
        select: {
          id: true,
          matricula: true,
          nomeFuncional: true,
          nomeCompletoSarh: true,
          usuario: { select: { nome: true } },
        },
      },
      funcaoTitular: {
        select: { categoria: true, codigo: true, descricao: true },
      },
    },
    orderBy: [{ dataInicio: "desc" }],
    take: 300,
  });

  const itens: RelatorioSubstituicaoItem[] = [];

  for (const substituicao of substituicoes) {
    const inicioApurado = maxData(substituicao.dataInicio, dataInicio);
    const fimSubstituicao = substituicao.dataFim ?? dataFim;
    const fimApurado = minData(fimSubstituicao, dataFim);

    const [afastamentos, faltas] = await Promise.all([
      prisma.afastamentoSarh.findMany({
        where: {
          servidorId: substituicao.titularServidorId,
          ativo: true,
          dataInicio: { lte: fimApurado },
          OR: [{ dataFim: null }, { dataFim: { gte: inicioApurado } }],
        },
        select: {
          dataInicio: true,
          dataFim: true,
          tipoDescricao: true,
          categoria: true,
        },
        orderBy: { dataInicio: "asc" },
      }),
      prisma.apuracaoDiaria.findMany({
        where: {
          servidorId: substituicao.titularServidorId,
          dataReferencia: { gte: inicioApurado, lte: fimApurado },
          resultado: "FALTA",
        },
        select: { dataReferencia: true, observacao: true },
        orderBy: { dataReferencia: "asc" },
      }),
    ]);

    const dias = new Set<string>();
    for (const afastamento of afastamentos) {
      const inicio = maxData(afastamento.dataInicio, inicioApurado);
      const fim = minData(afastamento.dataFim ?? fimApurado, fimApurado);
      for (const data of datasEntre(inicio, fim)) {
        dias.add(data);
      }
    }
    for (const falta of faltas) {
      dias.add(formatarData(falta.dataReferencia));
    }

    itens.push({
      id: substituicao.id,
      seccional: substituicao.orgao.sigla,
      unidade: substituicao.unidade
        ? `${substituicao.unidade.sigla} - ${substituicao.unidade.nome}`
        : "-",
      titular: nomeServidor(substituicao.titularServidor),
      titularMatricula: substituicao.titularServidor.matricula,
      substituto: nomeServidor(substituicao.substitutoServidor),
      substitutoMatricula: substituicao.substitutoServidor.matricula,
      funcao: substituicao.funcaoTitular
        ? `${substituicao.funcaoTitular.descricao} (${substituicao.funcaoTitular.categoria}-${substituicao.funcaoTitular.codigo})`
        : "Função não informada",
      tipo: substituicao.tipo,
      status: substituicao.status,
      periodoSubstituicao: `${formatarData(substituicao.dataInicio)} a ${formatarData(substituicao.dataFim)}`,
      periodoApurado: `${formatarData(inicioApurado)} a ${formatarData(fimApurado)}`,
      diasElegiveis: Array.from(dias).join(", ") || "-",
      quantidadeDias: dias.size,
      afastamentos:
        afastamentos
          .map(
            (afastamento) =>
              `${afastamento.tipoDescricao ?? afastamento.categoria}: ${formatarData(
                afastamento.dataInicio,
              )} a ${formatarData(afastamento.dataFim)}`,
          )
          .join("; ") || "-",
      faltas:
        faltas
          .map((falta) => `${formatarData(falta.dataReferencia)}${falta.observacao ? ` - ${falta.observacao}` : ""}`)
          .join("; ") || "-",
    });
  }

  const periodo = `${formatarData(dataInicio)} a ${formatarData(dataFim)}`;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Relatórios", href: "/relatorios" },
          { label: "Substituições de função" },
        ]}
      />

      <PageHeader
        icon={UserRoundCheck}
        titulo="Relatório de substituições de função"
        descricao="Consulte substituições automáticas ou designadas com base no cadastro de titular, substituto e ausências do titular."
      />

      <form className="rounded-lg border bg-[var(--card)] p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[180px_180px_minmax(240px,1fr)_auto] lg:items-end">
          <label className="grid gap-1 text-sm font-semibold">
            Data inicial
            <input
              type="date"
              name="dataInicio"
              defaultValue={isoData(dataInicio)}
              className="h-10 rounded-md border bg-[var(--background)] px-3 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Data final
            <input
              type="date"
              name="dataFim"
              defaultValue={isoData(dataFim)}
              className="h-10 rounded-md border bg-[var(--background)] px-3 text-sm"
            />
          </label>
          {podeEscolherServidor ? (
            <label className="grid gap-1 text-sm font-semibold">
              Servidor substituto
              <SearchableSelect
                id="relatorio-substituicao-servidor"
                name="servidorId"
                defaultValue={servidorId}
                placeholder="Todos os servidores permitidos"
                searchPlaceholder="Pesquisar por matrícula, nome ou seccional..."
                emptyMessage="Nenhum servidor encontrado."
                options={servidores.map((servidor) => ({
                  value: servidor.id,
                  label: `${servidor.orgao.sigla} / ${servidor.matricula} - ${nomeServidor(servidor)}`,
                  searchText: `${servidor.orgao.sigla} ${servidor.matricula} ${nomeServidor(servidor)}`,
                }))}
              />
            </label>
          ) : null}
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-bold text-white hover:bg-blue-800"
          >
            <Search className="size-4" aria-hidden="true" />
            Filtrar
          </button>
        </div>
      </form>

      <section className="rounded-lg border bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black">Substituições apuradas</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {itens.length} registro(s) no período {periodo}.
            </p>
          </div>
          <RelatorioSubstituicoesExport itens={itens} periodo={periodo} />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-3 py-3">Substituto</th>
                <th className="px-3 py-3">Titular</th>
                <th className="px-3 py-3">Função</th>
                <th className="px-3 py-3">Período</th>
                <th className="px-3 py-3">Dias</th>
                <th className="px-3 py-3">Motivo identificado</th>
                <th className="px-3 py-3">Seccional</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{item.substituto}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {item.substitutoMatricula}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold">{item.titular}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {item.titularMatricula}
                    </div>
                  </td>
                  <td className="px-3 py-3">{item.funcao}</td>
                  <td className="px-3 py-3">
                    <div>{item.periodoApurado}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      Cadastro: {item.periodoSubstituicao}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-black">{item.quantidadeDias}</div>
                    <div className="max-w-[260px] text-xs text-[var(--muted-foreground)]">
                      {item.diasElegiveis}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="max-w-[360px] text-xs leading-5">
                      {item.afastamentos !== "-" ? item.afastamentos : item.faltas}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold">{item.seccional}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {item.unidade}
                    </div>
                  </td>
                </tr>
              ))}
              {itens.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhuma substituição encontrada para o filtro informado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
