import { Users } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarServidorAction } from "@/modules/servidores/application/actions/criar-servidor.action";
import {
  listarCategoriasPessoasAtivas,
  listarOrgaosAtivosParaServidor,
} from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { ServidorForm } from "@/modules/servidores/presentation/components/servidor-form";

type NovoServidorPageProps = {
  searchParams?: Promise<{
    tipoUsuario?: string;
  }>;
};

function normalizarTipoUsuario(valor?: string | null) {
  return valor === "ESTAGIARIO" ||
    valor === "PRESTADOR" ||
    valor === "VOLUNTARIO"
    ? valor
    : "SERVIDOR";
}

function contextoNovoCadastro(tipoUsuario: string) {
  if (tipoUsuario === "ESTAGIARIO") {
    return {
      titulo: "Novo estagiario",
      breadcrumb: "Estagiarios",
      href: "/estagiarios",
      descricao:
        "Cadastre o estagiario controlado pelo ponto e crie o usuario associado.",
    };
  }

  if (tipoUsuario === "PRESTADOR") {
    return {
      titulo: "Novo prestador",
      breadcrumb: "Prestadores",
      href: "/prestadores",
      descricao:
        "Cadastre o prestador controlado pelo ponto e crie o usuario associado.",
    };
  }

  if (tipoUsuario === "VOLUNTARIO") {
    return {
      titulo: "Novo voluntario",
      breadcrumb: "Voluntarios",
      href: "/voluntarios",
      descricao:
        "Cadastre o voluntario controlado pelo ponto e crie o usuario associado.",
    };
  }

  return {
    titulo: "Nova pessoa",
    breadcrumb: "Pessoas",
    href: "/servidores",
    descricao:
      "Cadastre a pessoa e crie o usuario associado que sera usado para autenticacao e autorizacao no SECP.",
  };
}

export default async function NovoServidorPage({
  searchParams,
}: NovoServidorPageProps) {
  await exigirPermissaoOuRedirecionar("servidores:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const tipoUsuario = normalizarTipoUsuario(params.tipoUsuario);
  const contexto = contextoNovoCadastro(tipoUsuario);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds.length
      ? escopoOrgao.orgaoIds
      : ["00000000-0000-4000-8000-000000000000"];
  const [orgaos, categorias] = await Promise.all([
    listarOrgaosAtivosParaServidor({ orgaoIdsPermitidos }),
    listarCategoriasPessoasAtivas({ orgaoIdsPermitidos }),
  ]);
  const categoriaPadrao = categorias.find(
    (categoria) => categoria.codigo === tipoUsuario,
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: contexto.breadcrumb, href: contexto.href },
          { label: contexto.titulo },
        ]}
      />

      <PageHeader
        icon={Users}
        titulo={contexto.titulo}
        descricao="Cadastre o servidor e crie o usuário associado que será usado para autenticação e autorização no SECP."
        artigo="Arts. 4 e 8"
        regraTitulo="Cadastro funcional e apuração"
        regraDescricao="O cadastro do servidor será usado para definir jornada, lotação, apuração mensal, banco de horas e acesso ao espelho de frequência."
      />

      <ServidorForm
        action={criarServidorAction}
        orgaos={orgaos}
        categorias={categorias}
        modo="criar"
        valoresIniciais={{
          categoriaPessoaId: categoriaPadrao?.id ?? null,
          cpf: "",
          pis: "",
          ativo: true,
          tipoUsuario,
          vinculo: "EFETIVO",
          sinalizacaoForaExpediente: "PADRAO",
        }}
      />
    </div>
  );
}
