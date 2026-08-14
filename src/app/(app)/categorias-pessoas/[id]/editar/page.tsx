import { notFound } from "next/navigation";
import { Tags } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarCategoriaPessoaAction } from "@/modules/servidores/application/actions/categoria-pessoa.action";
import { CategoriaPessoaForm } from "@/modules/servidores/presentation/components/categoria-pessoa-form";
import { prisma } from "@/shared/infrastructure/database/prisma";

type EditarCategoriaPessoaPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditarCategoriaPessoaPage({
  params,
}: EditarCategoriaPessoaPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "servidores:gerenciar:global",
    "servidores:gerenciar:seccional",
  ]);

  const { id } = await params;
  const categoria = await prisma.categoriaPessoa.findUnique({
    where: { id },
  });

  if (!categoria) {
    notFound();
  }

  const action = atualizarCategoriaPessoaAction.bind(null, categoria.id);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Cadastro" },
          { label: "Categoria de pessoas", href: "/categorias-pessoas" },
          { label: categoria.nome },
          { label: "Editar" },
        ]}
      />

      <PageHeader
        icon={Tags}
        titulo="Editar categoria de pessoas"
        descricao="Atualize os dados da categoria usada no cadastro unificado de pessoas."
        artigo="Cadastro auxiliar"
        regraTitulo="Categoria da pessoa"
        regraDescricao="Categorias inativas deixam de aparecer para novos cadastros, mas continuam preservadas nos registros existentes."
      />

      <CategoriaPessoaForm
        action={action}
        modo="editar"
        valoresIniciais={{
          codigo: categoria.codigo,
          nome: categoria.nome,
          descricao: categoria.descricao,
          ativo: categoria.ativo,
        }}
      />
    </div>
  );
}
