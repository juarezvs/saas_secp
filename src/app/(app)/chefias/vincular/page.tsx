import { Network } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { vincularGestorUnidadeAction } from "@/modules/chefias/application/actions/vincular-gestor-unidade.action";
import {
  listarServidoresAtivosParaGestao,
  listarUnidadesAtivasParaGestao,
} from "@/modules/chefias/infrastructure/repositories/chefia.repository";
import { GestorUnidadeForm } from "@/modules/chefias/presentation/components/gestor-unidade-form";

export default async function VincularChefiaPage() {
  await exigirPermissaoOuRedirecionar("chefias:gerenciar:global");

  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds;
  const [unidades, servidores] = await Promise.all([
    listarUnidadesAtivasParaGestao({ orgaoIdsPermitidos }),
    listarServidoresAtivosParaGestao({ orgaoIdsPermitidos }),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Chefias", href: "/chefias" },
          { label: "Vincular chefia" },
        ]}
      />

      <PageHeader
        icon={Network}
        titulo="Vincular chefia"
        descricao="Cadastre gestor titular, substituto ou delegado responsável por uma unidade."
        artigo="Art. 16, §§ 1º e 2º"
        regraTitulo="Homologação e delegação de competência"
        regraDescricao="A chefia vinculada passa a responder pelas autorizações, análises e homologações de frequência dentro do escopo configurado."
      />

      <GestorUnidadeForm
        action={vincularGestorUnidadeAction}
        unidades={unidades}
        servidores={servidores}
      />
    </div>
  );
}
