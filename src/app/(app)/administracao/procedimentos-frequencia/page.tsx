import Link from "next/link";
import { ClipboardList, Edit, FileCheck2 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import {
  obterEscopoOrgaoDaSessao,
  whereOrgaoPermitido,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

function montarHrefPagina() {
  return "/administracao/procedimentos-frequencia";
}

export default async function ProcedimentosFrequenciaPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "procedimentos-frequencia:consultar:seccional",
    "procedimentos-frequencia:gerenciar:seccional",
    "procedimentos-frequencia:consultar:global",
    "procedimentos-frequencia:gerenciar:global",
  ]);

  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaos = await prisma.orgao.findMany({
    where: {
      ativo: true,
      ...whereOrgaoPermitido(escopoOrgao),
    },
    include: {
      _count: {
        select: {
          procedimentosFrequencia: true,
          procedimentosFrequenciaExecucoes: true,
        },
      },
    },
    orderBy: [{ sigla: "asc" }, { nome: "asc" }],
  });

  const totalProcedimentos = orgaos.reduce(
    (total, orgao) => total + orgao._count.procedimentosFrequencia,
    0,
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Procedimentos de frequência" },
        ]}
      />

      <PageHeader
        icon={ClipboardList}
        titulo="Procedimentos administrativos de frequência"
        descricao="Configure, por seccional, como o SECP deve tratar situações administrativas especiais sem misturar regras entre órgãos."
        regraTitulo="Objetivo final por seccional"
        regraDescricao="Cada órgão parametriza exigências, permissões e efeitos práticos, preservando histórico e trilha de auditoria."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Órgãos disponíveis
          </p>
          <p className="mt-2 text-3xl font-black">{orgaos.length}</p>
        </div>
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Procedimentos configurados
          </p>
          <p className="mt-2 text-3xl font-black">{totalProcedimentos}</p>
        </div>
        <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Objetivos cobertos
          </p>
          <p className="mt-2 text-3xl font-black">11</p>
        </div>
      </section>

      <div className="flex justify-end">
        <Link
          href="/administracao/procedimentos-frequencia/nada-consta"
          className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
        >
          <FileCheck2 className="size-4" aria-hidden="true" />
          Emitir Nada Consta
        </Link>
      </div>

      <DataTableShell
        title="Procedimentos por órgão"
        description="Acesse a seccional desejada para revisar exigências, permissões e efeitos administrativos."
        total={orgaos.length}
        pagina={1}
        totalPaginas={1}
        itensPorPagina={orgaos.length || 10}
        montarHrefPagina={montarHrefPagina}
        toolbar={null}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <caption className="sr-only">
              Listagem de procedimentos administrativos de frequência por órgão.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Órgão</th>
                <th className="px-5 py-3">Procedimentos</th>
                <th className="px-5 py-3">Execuções registradas</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {orgaos.map((orgao) => (
                <tr key={orgao.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4">
                    <div className="font-semibold">{orgao.sigla}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {orgao.nome}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {orgao._count.procedimentosFrequencia}
                  </td>
                  <td className="px-5 py-4">
                    {orgao._count.procedimentosFrequenciaExecucoes}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
                      <FileCheck2 className="size-3.5" aria-hidden="true" />
                      {orgao._count.procedimentosFrequencia > 0
                        ? "Configurado"
                        : "Pendente"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/administracao/procedimentos-frequencia/${orgao.id}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                    >
                      <Edit className="size-4" aria-hidden="true" />
                      Ajustar
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
