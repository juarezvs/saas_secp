import Link from "next/link";
import { ArrowRight, Plus, RefreshCw, UserRoundCheck } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import {
  obterEscopoOrgaoDaSessao,
  whereOrgaoPermitido,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

function formatarData(data?: Date | null) {
  return data
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data)
    : "-";
}

function montarHrefPagina() {
  return "/administracao/substituicoes-funcao";
}

export default async function SubstituicoesFuncaoPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "substituicoes-funcao:consultar:seccional",
    "substituicoes-funcao:gerenciar:seccional",
    "substituicoes-funcao:consultar:global",
    "substituicoes-funcao:gerenciar:global",
  ]);

  const escopo = await obterEscopoOrgaoDaSessao();
  const substituicoes = await prisma.substituicaoFuncao.findMany({
    where: {
      orgao: whereOrgaoPermitido(escopo),
    },
    include: {
      orgao: { select: { sigla: true } },
      unidade: { select: { sigla: true } },
      titularServidor: { select: { matricula: true, nomeFuncional: true, usuario: { select: { nome: true } } } },
      substitutoServidor: { select: { matricula: true, nomeFuncional: true, usuario: { select: { nome: true } } } },
      funcaoTitular: { select: { categoria: true, codigo: true, descricao: true } },
    },
    orderBy: [{ status: "asc" }, { dataInicio: "desc" }],
    take: 200,
  });

  const totalAtivas = substituicoes.filter((item) => item.status === "ATIVA").length;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Substituições de função" },
        ]}
      />

      <PageHeader
        icon={UserRoundCheck}
        titulo="Substituições de função"
        descricao="Gerencie titulares, substitutos, atos e períodos para manter o SECP pronto para operar sem dependência do SARH."
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
              Nova substituição
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-[var(--card)] p-4">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Cadastradas
          </p>
          <p className="mt-2 text-3xl font-black">{substituicoes.length}</p>
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
          <p className="mt-2 text-3xl font-black">
            {substituicoes.filter((item) => item.origem === "SARH").length}
          </p>
        </div>
      </section>

      <DataTableShell
        title="Substituições cadastradas"
        description="Mostrando até 200 registros mais recentes no escopo do perfil ativo."
        total={substituicoes.length}
        pagina={1}
        totalPaginas={1}
        itensPorPagina={substituicoes.length || 10}
        montarHrefPagina={montarHrefPagina}
        toolbar={null}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Seccional</th>
                <th className="px-5 py-3">Titular</th>
                <th className="px-5 py-3">Substituto</th>
                <th className="px-5 py-3">Função</th>
                <th className="px-5 py-3">Vigência</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
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
                      {item.titularServidor.nomeFuncional ?? item.titularServidor.usuario.nome}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {item.titularServidor.matricula}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {item.substitutoServidor.nomeFuncional ?? item.substitutoServidor.usuario.nome}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {item.substitutoServidor.matricula}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {item.funcaoTitular
                      ? `${item.funcaoTitular.categoria} ${item.funcaoTitular.codigo}`
                      : "-"}
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {item.funcaoTitular?.descricao ?? item.tipo}
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
