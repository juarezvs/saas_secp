import { ContactRound } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { alternarDominioCaracteristicaAction, salvarDominioCaracteristicaAction } from "@/modules/perfil-pessoal/application/configuracoes-perfil-pessoal.actions";
import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";

const tipos = [
  ["RACA", "Raça"], ["COR_CABELO", "Cor do cabelo"], ["COR_OLHOS", "Cor dos olhos"],
  ["TIPO_SANGUINEO", "Tipo sanguíneo"], ["IDENTIDADE_GENERO", "Identidade de gênero"],
] as const;

export default async function CaracteristicasPessoaisPage() {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar(["configuracoes:gerenciar:seccional", "configuracoes:gerenciar:global"]);
  const podeEditar = acesso.permissoes.some((item) => item.startsWith("configuracoes:gerenciar:"));
  const itens = await prismaListagem.dominioCaracteristicaPessoal.findMany({ orderBy: [{ tipo: "asc" }, { ordem: "asc" }, { nome: "asc" }] });
  return <div className="space-y-5">
    <Breadcrumb items={[{ label: "Cadastros Auxiliares" }, { label: "Características pessoais" }]} />
    <PageHeader icon={ContactRound} titulo="Características pessoais" descricao="Domínios do SARH utilizados na atualização do cadastro pessoal." />
    {podeEditar ? <form action={salvarDominioCaracteristicaAction} className="grid gap-2 border-y py-4 md:grid-cols-[12rem_8rem_minmax(0,1fr)_6rem_auto]">
      <select name="tipo" required className="h-10 rounded-md border bg-background px-3 text-sm">{tipos.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select>
      <input name="codigoSarh" required placeholder="Código SARH" className="h-10 rounded-md border bg-background px-3 text-sm" />
      <input name="nome" required placeholder="Descrição" className="h-10 rounded-md border bg-background px-3 text-sm" />
      <input name="ordem" type="number" min={0} defaultValue={0} className="h-10 rounded-md border bg-background px-3 text-sm" />
      <button className="h-10 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white">Adicionar</button>
    </form> : null}
    <div className="space-y-5">{tipos.map(([tipo, rotulo]) => {
      const registros = itens.filter((item) => item.tipo === tipo);
      return <section key={tipo} className="overflow-hidden rounded-md border"><div className="flex items-center justify-between border-b bg-muted px-4 py-2"><h2 className="font-bold">{rotulo}</h2><span className="text-xs text-muted-foreground">{registros.length} registros</span></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Código SARH</th><th className="p-3">Descrição</th><th className="p-3">Origem</th><th className="p-3">Ordem</th><th className="p-3">Status</th><th className="p-3 text-right">Ação</th></tr></thead><tbody>{registros.map((item) => <tr key={item.id} className="border-t"><td className="p-3 font-mono">{item.codigoSarh}</td><td className="p-3 font-semibold">{item.nome}</td><td className="p-3">{item.origem}</td><td className="p-3">{item.ordem}</td><td className="p-3">{item.ativo ? "Ativo" : "Inativo"}</td><td className="p-3 text-right">{podeEditar && item.origem !== "SARH" ? <form action={alternarDominioCaracteristicaAction}><input type="hidden" name="id" value={item.id} /><button className="font-semibold text-blue-800">{item.ativo ? "Desativar" : "Ativar"}</button></form> : "Somente leitura"}</td></tr>)}</tbody></table></div>
      </section>;
    })}</div>
  </div>;
}

