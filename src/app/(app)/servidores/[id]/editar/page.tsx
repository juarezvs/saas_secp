import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarServidorAction } from "@/modules/servidores/application/actions/atualizar-servidor.action";
import {
  buscarServidorPorId,
  listarOrgaosAtivosParaServidor,
} from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { ServidorForm } from "@/modules/servidores/presentation/components/servidor-form";
import {
  descricaoCargoServidor,
  descricaoFuncaoServidor,
} from "@/modules/servidores/application/services/funcao-cargo-servidor.service";

type EditarServidorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const ROTULOS_TIPO_PESSOA: Record<
  string,
  {
    breadcrumb: string;
    href: string;
    singular: string;
    cadastro: string;
  }
> = {
  SERVIDOR: {
    breadcrumb: "Servidores",
    href: "/servidores",
    singular: "servidor",
    cadastro: "Cadastro funcional",
  },
  ESTAGIARIO: {
    breadcrumb: "Estagiarios",
    href: "/estagiarios",
    singular: "estagiario",
    cadastro: "Cadastro de estagiarios",
  },
  PRESTADOR: {
    breadcrumb: "Prestadores",
    href: "/prestadores",
    singular: "prestador",
    cadastro: "Cadastro de prestadores",
  },
  VOLUNTARIO: {
    breadcrumb: "Voluntarios",
    href: "/voluntarios",
    singular: "voluntario",
    cadastro: "Cadastro de voluntarios",
  },
};

export default async function EditarServidorPage({
  params,
}: EditarServidorPageProps) {
  await exigirPermissaoOuRedirecionar("servidores:gerenciar:global");

  const { id } = await params;
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds.length
      ? escopoOrgao.orgaoIds
      : ["00000000-0000-4000-8000-000000000000"];

  const [servidor, orgaos] = await Promise.all([
    buscarServidorPorId(id),
    listarOrgaosAtivosParaServidor({ orgaoIdsPermitidos }),
  ]);

  if (!servidor) {
    notFound();
  }

  const action = atualizarServidorAction.bind(null, servidor.id);
  const rotuloPessoa =
    ROTULOS_TIPO_PESSOA[servidor.usuario.tipo] ?? ROTULOS_TIPO_PESSOA.SERVIDOR;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: rotuloPessoa.breadcrumb, href: rotuloPessoa.href },
          { label: servidor.matricula, href: `/servidores/${servidor.id}` },
          { label: "Editar" },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          {rotuloPessoa.cadastro}
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Editar {rotuloPessoa.singular}
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-(--muted-foreground)">
          Atualize os dados cadastrais e funcionais do {rotuloPessoa.singular}.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Art. 8º"
        titulo="Cadastro funcional e jornada"
        descricao="O cadastro funcional será usado nas próximas etapas para definição de jornada, escala, apuração mensal e registro eletrônico de frequência."
      />

      <ServidorForm
        action={action}
        orgaos={orgaos}
        modo="editar"
        valoresIniciais={{
          orgaoId: servidor.orgaoId,
          matricula: servidor.matricula,
          cpf: servidor.cpf || "",
          pis: servidor.pis || "",
          nome: servidor.usuario.nome,
          email: servidor.usuario.email,
          nomeFuncional: servidor.nomeFuncional,
          vinculo: servidor.vinculo,
          cargoDescricao: descricaoCargoServidor(servidor),
          funcaoDescricao: descricaoFuncaoServidor(servidor),
          descricaoProvimentoSarh: servidor.descricaoProvimentoSarh,
          descricaoSituacaoSarh: servidor.descricaoSituacaoSarh,
          sinalizacaoForaExpediente:
            servidor.horasForaExpedienteInconsistente === null
              ? "PADRAO"
              : servidor.horasForaExpedienteInconsistente
                ? "SINALIZAR"
                : "NAO_SINALIZAR",
          ativo: servidor.ativo,
        }}
      />
    </div>
  );
}
