import Link from "next/link";
import { ArrowRight, Plus, RefreshCw, UserRoundCheck } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import type { Prisma } from "@/generated/prisma/client";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { SubstituicoesFuncaoListagemControles } from "@/modules/substituicoes-funcao/presentation/components/substituicoes-funcao-listagem-controles";
import { prisma } from "@/shared/infrastructure/database/prisma";

const ORGAO_ID_SEM_ACESSO = "00000000-0000-4000-8000-000000000000";
const ITENS_POR_PAGINA_PADRAO = 20;
const ITENS_POR_PAGINA_MAXIMO = 100;

type SubstituicoesFuncaoPageProps = {
  searchParams?: Promise<{
    orgaoId?: string;
    titularServidorId?: string;
    substitutoServidorId?: string;
    funcaoId?: string;
    dataInicio?: string;
    dataFim?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

function formatarData(data?: Date | null) {
  return data
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data)
    : "-";
}

function normalizarNumero(
  valor: string | undefined,
  fallback: number,
  minimo: number,
  maximo: number,
) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(numero), minimo), maximo);
}

function dataUtc(valor?: string) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return undefined;
  }

  return new Date(`${valor}T00:00:00.000Z`);
}

function resolverOrgaoIdsFiltro({
  global,
  orgaoIdsPermitidos,
  orgaoId,
}: {
  global: boolean;
  orgaoIdsPermitidos: string[];
  orgaoId?: string;
}) {
  if (global) {
    return orgaoId ? [orgaoId] : undefined;
  }

  if (orgaoId) {
    return orgaoIdsPermitidos.includes(orgaoId)
      ? [orgaoId]
      : [ORGAO_ID_SEM_ACESSO];
  }

  return orgaoIdsPermitidos.length
    ? orgaoIdsPermitidos
    : [ORGAO_ID_SEM_ACESSO];
}

function montarWhereSubstituicoes({
  orgaoIdsFiltro,
  titularServidorId,
  substitutoServidorId,
  funcaoId,
  dataInicio,
  dataFim,
}: {
  orgaoIdsFiltro?: string[];
  titularServidorId?: string;
  substitutoServidorId?: string;
  funcaoId?: string;
  dataInicio?: string;
  dataFim?: string;
}): Prisma.SubstituicaoFuncaoWhereInput {
  const dataInicioFiltro = dataUtc(dataInicio);
  const dataFimFiltro = dataUtc(dataFim);
  const and: Prisma.SubstituicaoFuncaoWhereInput[] = [];

  if (dataInicioFiltro) {
    and.push({
      OR: [{ dataFim: null }, { dataFim: { gte: dataInicioFiltro } }],
    });
  }

  if (funcaoId) {
    and.push({
      OR: [{ funcaoTitularId: funcaoId }, { funcaoSubstitutoId: funcaoId }],
    });
  }

  return {
    ...(orgaoIdsFiltro ? { orgaoId: { in: orgaoIdsFiltro } } : {}),
    ...(titularServidorId ? { titularServidorId } : {}),
    ...(substitutoServidorId ? { substitutoServidorId } : {}),
    ...(dataFimFiltro ? { dataInicio: { lte: dataFimFiltro } } : {}),
    ...(and.length ? { AND: and } : {}),
  };
}

function montarHrefPagina(baseParams: URLSearchParams, novaPagina: number) {
  const query = new URLSearchParams(baseParams);
  query.set("pagina", String(novaPagina));

  return `/administracao/substituicoes-funcao?${query.toString()}`;
}

export default async function SubstituicoesFuncaoPage({
  searchParams,
}: SubstituicoesFuncaoPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "substituicoes-funcao:consultar:seccional",
    "substituicoes-funcao:gerenciar:seccional",
    "substituicoes-funcao:consultar:global",
    "substituicoes-funcao:gerenciar:global",
  ]);

  const escopo = await obterEscopoOrgaoDaSessao();
  const params = searchParams ? await searchParams : {};
  const pagina = normalizarNumero(params.pagina, 1, 1, 999999);
  const itensPorPagina = normalizarNumero(
    params.itensPorPagina,
    ITENS_POR_PAGINA_PADRAO,
    1,
    ITENS_POR_PAGINA_MAXIMO,
  );
  const orgaoIdsFiltro = resolverOrgaoIdsFiltro({
    global: escopo.global,
    orgaoIdsPermitidos: escopo.orgaoIds,
    orgaoId: params.orgaoId,
  });
  const orgaoIdsParaOpcoes =
    orgaoIdsFiltro ?? (escopo.global ? undefined : escopo.orgaoIds);
  const where = montarWhereSubstituicoes({
    orgaoIdsFiltro,
    titularServidorId: params.titularServidorId,
    substitutoServidorId: params.substitutoServidorId,
    funcaoId: params.funcaoId,
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
  });

  const total = await prisma.substituicaoFuncao.count({ where });
  const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const [
    totalAtivas,
    totalOrigemSarh,
    substituicoes,
    orgaos,
    servidores,
    funcoes,
  ] = await Promise.all([
    prisma.substituicaoFuncao.count({ where: { ...where, status: "ATIVA" } }),
    prisma.substituicaoFuncao.count({ where: { ...where, origem: "SARH" } }),
    prisma.substituicaoFuncao.findMany({
      where,
      include: {
        orgao: { select: { sigla: true } },
        unidade: { select: { sigla: true } },
        titularServidor: {
          select: {
            matricula: true,
            nomeFuncional: true,
            usuario: { select: { nome: true } },
          },
        },
        substitutoServidor: {
          select: {
            matricula: true,
            nomeFuncional: true,
            usuario: { select: { nome: true } },
          },
        },
        funcaoTitular: {
          select: { categoria: true, codigo: true, descricao: true },
        },
        funcaoSubstituto: {
          select: { categoria: true, codigo: true, descricao: true },
        },
      },
      orderBy: [{ status: "asc" }, { dataInicio: "desc" }],
      skip: (paginaAtual - 1) * itensPorPagina,
      take: itensPorPagina,
    }),
    escopo.global
      ? prisma.orgao.findMany({
          where: { ativo: true },
          orderBy: [{ sigla: "asc" }],
          select: { id: true, sigla: true, nome: true },
        })
      : Promise.resolve(escopo.orgaos),
    prisma.servidor.findMany({
      where: {
        ativo: true,
        usuario: { ativo: true, tipo: "SERVIDOR" },
        ...(orgaoIdsParaOpcoes?.length
          ? { orgaoId: { in: orgaoIdsParaOpcoes } }
          : {}),
      },
      orderBy: [{ nomeFuncional: "asc" }, { matricula: "asc" }],
      select: {
        id: true,
        matricula: true,
        nomeFuncional: true,
        usuario: { select: { nome: true } },
        orgao: { select: { sigla: true } },
      },
    }),
    prisma.funcaoConfiancaReferencia.findMany({
      where: {
        ativo: true,
        ...(orgaoIdsParaOpcoes?.length
          ? {
              OR: [
                { orgaoId: { in: orgaoIdsParaOpcoes } },
                { orgaoId: null },
              ],
            }
          : {}),
      },
      orderBy: [{ categoria: "asc" }, { codigo: "asc" }],
      select: {
        id: true,
        categoria: true,
        codigo: true,
        descricao: true,
        orgao: { select: { sigla: true } },
      },
    }),
  ]);

  const baseParams = new URLSearchParams();

  for (const chave of [
    "orgaoId",
    "titularServidorId",
    "substitutoServidorId",
    "funcaoId",
    "dataInicio",
    "dataFim",
  ] as const) {
    if (params[chave]) {
      baseParams.set(chave, params[chave]!);
    }
  }

  baseParams.set("itensPorPagina", String(itensPorPagina));

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administracao", href: "/administracao" },
          { label: "Substituicoes de funcao" },
        ]}
      />

      <PageHeader
        icon={UserRoundCheck}
        titulo="Substituicoes de funcao"
        descricao="Gerencie titulares, substitutos, atos e periodos para manter o SECP pronto para operar sem dependencia do SARH."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/administracao/integracoes/sarh"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-[var(--muted)]"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Sincronizar SARH
            </Link>
            <Link
              href="/administracao/substituicoes-funcao/novo"
              className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800"
            >
              <Plus className="size-4" aria-hidden="true" />
              Nova substituicao
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-[var(--card)] p-4">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Cadastradas
          </p>
          <p className="mt-2 text-3xl font-black">{total}</p>
        </div>
        <div className="rounded-lg border bg-[var(--card)] p-4">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Ativas
          </p>
          <p className="mt-2 text-3xl font-black">{totalAtivas}</p>
        </div>
        <div className="rounded-lg border bg-[var(--card)] p-4">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Origem SARH
          </p>
          <p className="mt-2 text-3xl font-black">{totalOrigemSarh}</p>
        </div>
      </section>

      <DataTableShell
        title="Substituicoes cadastradas"
        description="Registros no escopo do perfil ativo, com filtros por seccional, titular, substituto, funcao e vigencia."
        total={total}
        pagina={paginaAtual}
        totalPaginas={totalPaginas}
        itensPorPagina={itensPorPagina}
        montarHrefPagina={(novaPagina) =>
          montarHrefPagina(baseParams, novaPagina)
        }
        toolbar={
          <SubstituicoesFuncaoListagemControles
            orgaos={orgaos.map((orgao) => ({
              id: orgao.id,
              sigla: orgao.sigla,
            }))}
            titulares={servidores.map((servidor) => {
              const nome = nomeServidor(servidor) || "Servidor sem nome";

              return {
                value: servidor.id,
                label: `${servidor.orgao.sigla} / ${servidor.matricula} - ${nome}`,
                searchText:
                  `${servidor.orgao.sigla} ${servidor.matricula} ${nome}`.toLowerCase(),
              };
            })}
            substitutos={servidores.map((servidor) => {
              const nome = nomeServidor(servidor) || "Servidor sem nome";

              return {
                value: servidor.id,
                label: `${servidor.orgao.sigla} / ${servidor.matricula} - ${nome}`,
                searchText:
                  `${servidor.orgao.sigla} ${servidor.matricula} ${nome}`.toLowerCase(),
              };
            })}
            funcoes={funcoes.map((funcao) => ({
              value: funcao.id,
              label: `${funcao.orgao?.sigla ? `${funcao.orgao.sigla} / ` : ""}${funcao.categoria} ${funcao.codigo} - ${funcao.descricao}`,
              searchText: [
                funcao.orgao?.sigla,
                funcao.categoria,
                funcao.codigo,
                funcao.descricao,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
            }))}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Seccional</th>
                <th className="px-5 py-3">Titular</th>
                <th className="px-5 py-3">Substituto</th>
                <th className="px-5 py-3">Funcao</th>
                <th className="px-5 py-3">Vigencia</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {substituicoes.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]"
                  >
                    Nenhuma substituicao encontrada para os filtros informados.
                  </td>
                </tr>
              )}
              {substituicoes.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4">
                    <div className="font-semibold">{item.orgao.sigla}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {item.unidade?.sigla ?? "Sem unidade"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {nomeServidor(item.titularServidor)}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {item.titularServidor.matricula}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {nomeServidor(item.substitutoServidor)}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {item.substitutoServidor.matricula}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {item.funcaoTitular
                      ? `${item.funcaoTitular.categoria} ${item.funcaoTitular.codigo}`
                      : item.funcaoSubstituto
                        ? `${item.funcaoSubstituto.categoria} ${item.funcaoSubstituto.codigo}`
                        : "-"}
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {item.funcaoTitular?.descricao ??
                        item.funcaoSubstituto?.descricao ??
                        item.tipo}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {formatarData(item.dataInicio)} a {formatarData(item.dataFim)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full border px-2 py-1 text-xs font-semibold">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/administracao/substituicoes-funcao/${item.id}/editar`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                    >
                      <ArrowRight className="size-4" aria-hidden="true" />
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}
