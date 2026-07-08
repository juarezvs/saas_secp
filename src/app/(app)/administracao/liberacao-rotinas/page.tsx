import { ToggleLeft } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { salvarLiberacoesRotinasAction } from "@/modules/rotinas/application/actions/salvar-liberacoes-rotinas.action";
import { listarRotinasComPermissoes } from "@/modules/rotinas/application/services/liberacao-rotinas.service";
import { LiberacaoRotinasForm } from "@/modules/rotinas/presentation/components/liberacao-rotinas-form";

type LiberacaoRotinasPageProps = {
  searchParams?: Promise<{
    salvo?: string;
  }>;
};

export default async function LiberacaoRotinasPage({
  searchParams,
}: LiberacaoRotinasPageProps) {
  await exigirPermissaoOuRedirecionar("configuracoes:gerenciar:global");

  const [params, rotinas] = await Promise.all([
    searchParams ?? Promise.resolve({} as { salvo?: string }),
    listarRotinasComPermissoes(),
  ]);
  const salvo = params.salvo;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Liberação de Rotinas" },
        ]}
      />

      <PageHeader
        icon={ToggleLeft}
        titulo="Liberação de Rotinas"
        descricao="Controle quais rotinas e permissões ficam disponíveis no SECP, além da associação normal aos perfis."
        artigo="Governança de homologação"
        regraTitulo="Liberação operacional"
        regraDescricao="Rotinas em homologação podem permanecer ocultas e bloqueadas até estarem aptas para uso pelos perfis autorizados."
      />

      {salvo === "1" && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
          Liberações atualizadas com sucesso.
        </div>
      )}

      <LiberacaoRotinasForm
        rotinas={rotinas}
        action={salvarLiberacoesRotinasAction}
      />
    </div>
  );
}
