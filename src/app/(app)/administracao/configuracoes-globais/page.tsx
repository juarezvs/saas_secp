import { Globe2 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { salvarDominiosEmailAction } from "@/modules/perfil-pessoal/application/configuracoes-perfil-pessoal.actions";
import { prisma } from "@/shared/infrastructure/database/prisma";

export default async function ConfiguracoesGlobaisPage() {
  await exigirPermissaoOuRedirecionar("configuracoes:gerenciar:global");
  const config = await prisma.configuracaoGlobal.upsert({ where: { id: "global" }, create: { id: "global", dominiosEmailInstitucionais: ["trf1.jus.br"] }, update: {} });
  return <div className="space-y-5">
    <Breadcrumb items={[{ label: "Administração", href: "/administracao" }, { label: "Configurações globais" }]} />
    <PageHeader icon={Globe2} titulo="Configurações globais" descricao="Parâmetros institucionais compartilhados por todas as seccionais." />
    <form action={salvarDominiosEmailAction} className="max-w-3xl space-y-4 border-y py-5">
      <label className="block space-y-2"><span className="text-sm font-bold">Domínios eletrônicos da instituição</span><textarea name="dominios" required defaultValue={config.dominiosEmailInstitucionais.join("\n")} rows={6} className="w-full rounded-md border bg-background p-3 text-sm" /><span className="block text-xs text-muted-foreground">Informe um domínio por linha, sem o símbolo @.</span></label>
      <button className="h-10 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white">Salvar configuração</button>
    </form>
  </div>;
}
