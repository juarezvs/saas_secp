import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui";
import { obterPermissoesDaSessao } from "@/modules/auth/application/services/permissao.service";
import {
  PERMISSOES_ACOMPANHAMENTO_ESTAGIO,
  buscarPrimeiroEstagiarioSupervisionadoPorUsuario,
  carregarAcompanhamentoEstagio,
  carregarAcompanhamentoEstagioPorServidor,
  competenciaParaInputEstagio,
  listarEstagiariosSupervisionadosPorUsuario,
  normalizarCompetenciaEstagio,
  usuarioPossuiSupervisaoEstagioVigente,
  type DadosAcompanhamentoEstagio,
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
  const permissao = await obterPermissoesDaSessao();
  if (!permissao.permitido) {
    redirect("/login");
  }
  const params = await searchParams;
  const { ano, mes } = normalizarCompetenciaEstagio(params);
  const permissoes = new Set(permissao.permissoes);
  const supervisionaEstagiario =
    permissoes.has(PERMISSOES_ACOMPANHAMENTO_ESTAGIO.supervisionar) ||
    (await usuarioPossuiSupervisaoEstagioVigente(permissao.usuarioId));
  const podeAcessar =
    supervisionaEstagiario ||
    permissoes.has(PERMISSOES_ACOMPANHAMENTO_ESTAGIO.consultar) ||
    permissoes.has(PERMISSOES_ACOMPANHAMENTO_ESTAGIO.preencher) ||
    permissoes.has(PERMISSOES_ACOMPANHAMENTO_ESTAGIO.consultarSeccional);

  if (!podeAcessar) {
    redirect(
      `/acesso-negado?permissao=${encodeURIComponent(
        `${PERMISSOES_ACOMPANHAMENTO_ESTAGIO.consultar} ou ${PERMISSOES_ACOMPANHAMENTO_ESTAGIO.preencher}`,
      )}`,
    );
  }
  const servidorId = params.servidorId;
  const estagiariosSupervisionados = supervisionaEstagiario
    ? await listarEstagiariosSupervisionadosPorUsuario({
        usuarioId: permissao.usuarioId,
        ano,
        mes,
      })
    : [];
  let dados: DadosAcompanhamentoEstagio | null = servidorId
    ? await carregarAcompanhamentoEstagioPorServidor({
        servidorId,
        usuarioId: permissao.usuarioId ?? "",
        ano,
        mes,
        modo: supervisionaEstagiario ? "SUPERVISOR" : "CONSULTA",
        orgaoIds: permissao.orgaoIds,
      })
    : await carregarAcompanhamentoEstagio({
        usuarioId: permissao.usuarioId ?? "",
        ano,
        mes,
      });

  if (!servidorId && !dados && supervisionaEstagiario) {
    const competencia = competenciaParaInputEstagio(ano, mes);
    const estagiarioSupervisionado =
      await buscarPrimeiroEstagiarioSupervisionadoPorUsuario({
        usuarioId: permissao.usuarioId,
      });

    if (estagiarioSupervisionado) {
      redirect(
        `/acompanhamento-estagio?competencia=${competencia}&servidorId=${estagiarioSupervisionado.id}`,
      );
    }
  }

  if (dados && supervisionaEstagiario) {
    dados = {
      ...dados,
      estagiariosSupervisionados,
    };
  }

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
