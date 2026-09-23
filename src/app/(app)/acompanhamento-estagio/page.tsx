import { ClipboardList } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  PERMISSOES_ACOMPANHAMENTO_ESTAGIO,
  carregarAcompanhamentoEstagio,
  carregarAcompanhamentoEstagioPorServidor,
  normalizarCompetenciaEstagio,
} from "@/modules/acompanhamento-estagio/application/services/acompanhamento-estagio.service";
import { AcompanhamentoEstagioPage } from "@/modules/acompanhamento-estagio/presentation/components/acompanhamento-estagio-page";

type AcompanhamentoEstagioRouteProps = {
  searchParams: Promise<{
    competencia?: string;
    anoReferencia?: string;
    mesReferencia?: string;
    servidorId?: string;
  }>;
};

export default async function AcompanhamentoMensalEstagioRoute({
  searchParams,
}: AcompanhamentoEstagioRouteProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    PERMISSOES_ACOMPANHAMENTO_ESTAGIO.consultar,
    PERMISSOES_ACOMPANHAMENTO_ESTAGIO.preencher,
    PERMISSOES_ACOMPANHAMENTO_ESTAGIO.supervisionar,
    PERMISSOES_ACOMPANHAMENTO_ESTAGIO.consultarSeccional,
  ]);
  const params = await searchParams;
  const { ano, mes } = normalizarCompetenciaEstagio(params);
  const permissoes = new Set(permissao.permissoes);
  const servidorId = params.servidorId;
  const dados = servidorId
    ? await carregarAcompanhamentoEstagioPorServidor({
        servidorId,
        usuarioId: permissao.usuarioId ?? "",
        ano,
        mes,
        modo: permissoes.has(PERMISSOES_ACOMPANHAMENTO_ESTAGIO.supervisionar)
          ? "SUPERVISOR"
          : "CONSULTA",
        orgaoIds: permissao.orgaoIds,
      })
    : await carregarAcompanhamentoEstagio({
        usuarioId: permissao.usuarioId ?? "",
        ano,
        mes,
      });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Acompanhamento mensal de estágio" }]} />

      <PageHeader
        icon={ClipboardList}
        titulo="Acompanhamento mensal de estágio"
        descricao="Registre as atividades desenvolvidas somente nos dias em que há marcação de ponto na competência."
        regraTitulo="Registro mensal do estágio"
        regraDescricao="O preenchimento fica restrito aos dias com presença registrada, bloqueia datas futuras e exige assinatura por senha no fechamento."
      />

      {dados ? (
        <AcompanhamentoEstagioPage dados={dados} />
      ) : (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          O acompanhamento mensal de estágio está disponível apenas para
          estagiários ativos.
        </Card>
      )}
    </div>
  );
}
