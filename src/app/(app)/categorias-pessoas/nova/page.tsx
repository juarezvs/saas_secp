import { Tags } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarCategoriaPessoaAction } from "@/modules/servidores/application/actions/categoria-pessoa.action";
import { CategoriaPessoaForm } from "@/modules/servidores/presentation/components/categoria-pessoa-form";

export default async function NovaCategoriaPessoaPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "servidores:gerenciar:global",
    "servidores:gerenciar:seccional",
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Cadastro" },
          { label: "Categoria de pessoas", href: "/categorias-pessoas" },
          { label: "Nova" },
        ]}
      />

      <PageHeader
        icon={Tags}
        titulo="Nova categoria de pessoas"
        descricao="Crie uma categoria para classificar pessoas no cadastro unificado."
        artigo="Cadastro auxiliar"
        regraTitulo="Categoria da pessoa"
        regraDescricao="A categoria sera usada como filtro pesquisavel e como classificacao do cadastro de ponto."
      />

      <CategoriaPessoaForm action={criarCategoriaPessoaAction} modo="criar" />
    </div>
  );
}
