import { notFound } from "next/navigation";
import { UserRoundCheck } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import {
  obterEscopoOrgaoDaSessao,
  whereOrgaoPermitido,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarSubstituicaoFuncaoAction } from "@/modules/substituicoes-funcao/presentation/actions/substituicoes-funcao.actions";
import { carregarDadosFormularioSubstituicaoFuncao } from "@/modules/substituicoes-funcao/presentation/components/substituicao-funcao-form-data";
import { SubstituicaoFuncaoForm } from "@/modules/substituicoes-funcao/presentation/components/substituicao-funcao-form";
import { prisma } from "@/shared/infrastructure/database/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

function dataInput(data?: Date | null) {
  return data ? data.toISOString().slice(0, 10) : "";
}

export default async function EditarSubstituicaoFuncaoPage({ params }: Props) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "substituicoes-funcao:gerenciar:seccional",
    "substituicoes-funcao:gerenciar:global",
  ]);
  const { id } = await params;
  const escopo = await obterEscopoOrgaoDaSessao();
  const substituicao = await prisma.substituicaoFuncao.findFirst({
    where: {
      id,
      orgao: whereOrgaoPermitido(escopo),
    },
    include: {
      titularServidor: { select: { matricula: true } },
      substitutoServidor: { select: { matricula: true } },
    },
  });

  if (!substituicao) {
    notFound();
  }

  const dados = await carregarDadosFormularioSubstituicaoFuncao();
  const action = atualizarSubstituicaoFuncaoAction.bind(null, substituicao.id);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          {
            label: "Substituições de função",
            href: "/administracao/substituicoes-funcao",
          },
          { label: "Editar" },
        ]}
      />

      <PageHeader
        icon={UserRoundCheck}
        titulo="Editar substituição de função"
        descricao={`${substituicao.titularServidor.matricula} substituído por ${substituicao.substitutoServidor.matricula}.`}
      />

      <SubstituicaoFuncaoForm
        action={action}
        modo="editar"
        valores={{
          orgaoId: substituicao.orgaoId,
          unidadeId: substituicao.unidadeId,
          titularServidorId: substituicao.titularServidorId,
          substitutoServidorId: substituicao.substitutoServidorId,
          funcaoTitularId: substituicao.funcaoTitularId,
          funcaoSubstitutoId: substituicao.funcaoSubstitutoId,
          tipo: substituicao.tipo,
          status: substituicao.status,
          dataInicio: dataInput(substituicao.dataInicio),
          dataFim: dataInput(substituicao.dataFim),
          atoDesignacao: substituicao.atoDesignacao,
          dataAtoDesignacao: dataInput(substituicao.dataAtoDesignacao),
          dataPublicacaoAto: dataInput(substituicao.dataPublicacaoAto),
          atoDispensa: substituicao.atoDispensa,
          dataAtoDispensa: dataInput(substituicao.dataAtoDispensa),
          dataPublicacaoDispensa: dataInput(
            substituicao.dataPublicacaoDispensa,
          ),
          processoSei: substituicao.processoSei,
          observacao: substituicao.observacao,
        }}
        {...dados}
      />
    </div>
  );
}
