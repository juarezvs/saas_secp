import { Select as SelectPesquisavel } from "@/components/ui/form-controls";

import { MapPinned, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  alternarCidadeAction,
  alternarEstadoAction,
  salvarCidadeAction,
  salvarEstadoAction,
  sincronizarLocalidadesIbgeAction,
} from "@/modules/localidades/application/actions/localidades.actions";
import { prisma } from "@/shared/infrastructure/database/prisma";

const permissoesConsulta = [
  "localidade:consultar:seccional",
  "localidade:cadastrar:seccional",
  "localidade:cadastrar:master",
  "configuracoes:gerenciar:seccional",
  "configuracoes:gerenciar:global",
];

export default async function EstadosCidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ uf?: string; sincronizados?: string }>;
}) {
  const [acesso, parametros, estados] = await Promise.all([
    exigirUmaDasPermissoesOuRedirecionar(permissoesConsulta),
    searchParams,
    prisma.estado.findMany({
      orderBy: { nome: "asc" },
      include: { _count: { select: { cidades: true } } },
    }),
  ]);
  const podeCadastrar = acesso.permissoes.some(
    (item) =>
      item.startsWith("localidade:cadastrar:") ||
      item.startsWith("configuracoes:gerenciar:"),
  );
  const estadoSelecionado =
    estados.find((estado) => estado.sigla === parametros.uf?.toUpperCase()) ??
    estados[0] ??
    null;
  const cidades = estadoSelecionado
    ? await prisma.cidade.findMany({
        where: { estadoId: estadoSelecionado.id },
        orderBy: { nome: "asc" },
      })
    : [];

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Cadastros Auxiliares" },
          { label: "Estados/Cidades" },
        ]}
      />
      <PageHeader
        icon={MapPinned}
        titulo="Estados/Cidades"
        descricao="Base oficial de localidades utilizada nos cadastros do SECP."
      />

      {parametros.sincronizados ? (
        <div className="border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          Sincronização concluída. Foram carregados {parametros.sincronizados.replace("-", " estados e ")} cidades.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
        <p className="text-sm text-muted-foreground">
          {estados.length} estados e {estados.reduce((total, estado) => total + estado._count.cidades, 0)} cidades cadastradas.
        </p>
        {podeCadastrar ? (
          <form action={sincronizarLocalidadesIbgeAction}>
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800">
              <RefreshCw className="size-4" />
              Sincronizar com IBGE
            </button>
          </form>
        ) : null}
      </div>

      {podeCadastrar ? (
        <div className="grid gap-3 border-b pb-4 lg:grid-cols-2">
          <form action={salvarEstadoAction} className="grid gap-2 sm:grid-cols-[8rem_5rem_minmax(0,1fr)_auto]">
            <strong className="sm:col-span-4 text-sm">Novo estado</strong>
            <input name="id" type="number" required placeholder="Cód. IBGE" className="h-10 rounded-md border bg-background px-3 text-sm" />
            <input name="sigla" required maxLength={2} placeholder="UF" className="h-10 rounded-md border bg-background px-3 text-sm uppercase" />
            <input name="nome" required placeholder="Nome do estado" className="h-10 rounded-md border bg-background px-3 text-sm" />
            <button className="h-10 rounded-md border px-4 text-sm font-semibold">Adicionar</button>
          </form>
          <form action={salvarCidadeAction} className="grid gap-2 sm:grid-cols-[8rem_6rem_minmax(0,1fr)_auto]">
            <strong className="sm:col-span-4 text-sm">Nova cidade</strong>
            <input name="id" type="number" required placeholder="Cód. IBGE" className="h-10 rounded-md border bg-background px-3 text-sm" />
            <SelectPesquisavel name="estadoId" required defaultValue={estadoSelecionado?.id} className="h-10 rounded-md border bg-background px-2 text-sm">
              {estados.map((estado) => <option key={estado.id} value={estado.id}>{estado.sigla}</option>)}
            </SelectPesquisavel>
            <input name="nome" required placeholder="Nome da cidade" className="h-10 rounded-md border bg-background px-3 text-sm" />
            <button className="h-10 rounded-md border px-4 text-sm font-semibold">Adicionar</button>
          </form>
        </div>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-md border">
          <div className="border-b bg-muted px-3 py-2 text-sm font-bold">Estados</div>
          <div className="max-h-[38rem] overflow-y-auto">
            {estados.map((estado) => (
              <div key={estado.id} className={`flex items-center gap-2 border-b p-2 last:border-b-0 ${estado.id === estadoSelecionado?.id ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}>
                <Link href={`?uf=${estado.sigla}`} className="min-w-0 flex-1 text-sm">
                  <span className="font-bold">{estado.sigla}</span> · {estado.nome}
                  <span className="ml-1 text-xs text-muted-foreground">{estado.origem}</span>
                  <span className="ml-1 text-xs text-muted-foreground">({estado._count.cidades})</span>
                </Link>
                {!estado.ativo ? <span className="text-xs text-red-700">Inativo</span> : null}
                {podeCadastrar && estado.origem !== "SARH" ? (
                  <form action={alternarEstadoAction}>
                    <input type="hidden" name="id" value={estado.id} />
                    <button title={estado.ativo ? "Desativar estado" : "Ativar estado"} className="text-xs font-semibold text-blue-800">
                      {estado.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border">
          <div className="flex items-center justify-between border-b bg-muted px-3 py-2">
            <strong className="text-sm">Cidades de {estadoSelecionado?.nome ?? "-"}</strong>
            <span className="text-xs text-muted-foreground">{cidades.length} registros</span>
          </div>
          <div className="max-h-[38rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-background">
                <tr><th className="p-3">Código IBGE</th><th className="p-3">Cidade</th><th className="p-3">Origem</th><th className="p-3">Status</th><th className="p-3 text-right">Ação</th></tr>
              </thead>
              <tbody>
                {cidades.map((cidade) => (
                  <tr key={cidade.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{cidade.id}</td>
                    <td className="p-3 font-semibold">{cidade.nome}</td>
                    <td className="p-3">{cidade.origem}</td>
                    <td className="p-3">{cidade.ativo ? "Ativa" : "Inativa"}</td>
                    <td className="p-3 text-right">
                      {podeCadastrar && cidade.origem !== "SARH" ? (
                        <form action={alternarCidadeAction}>
                          <input type="hidden" name="id" value={cidade.id} />
                          <button className="text-sm font-semibold text-blue-800">{cidade.ativo ? "Desativar" : "Ativar"}</button>
                        </form>
                      ) : <span className="text-muted-foreground">Somente leitura</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
