import { Globe2 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { SwitchField } from "@/components/ui/switch";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { salvarDominiosEmailAction, salvarModoOficialMctAction } from "@/modules/perfil-pessoal/application/configuracoes-perfil-pessoal.actions";
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
    <form action={salvarModoOficialMctAction} className="max-w-3xl space-y-4 border-b py-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-sm font-bold">MCT como fonte oficial da apuração</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Quando ativo, novas análises MCT de competências abertas atualizam a apuração oficial e o banco de horas. Competências enviadas ou homologadas permanecem protegidas.
          </p>
        </div>
        <SwitchField name="mctModoOficialAtivo" defaultChecked={config.mctModoOficialAtivo} aria-label="Ativar MCT como fonte oficial" />
      </div>
      <button className="h-10 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white">Salvar modo do MCT</button>
    </form>
  </div>;
}
