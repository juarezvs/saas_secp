import {
  buscarContrachequeSarh,
  listarDocumentosContrachequeSarh,
} from "@/modules/contracheque/infrastructure/oracle/contracheque-oracle.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { selecionarBaseRemuneratoriaContracheque } from "../../application/services/base-remuneratoria-contracheque.service";

import {
  RemuneracaoIndisponivelError,
  type ObterVigenciasRemuneratoriasInput,
  type RemuneracaoProvider,
  type VigenciaRemuneratoriaComSnapshot,
} from "../../application/integrations/remuneracao-provider";

function competenciaInicio(competencia: string) {
  return `${competencia}-01`;
}

function competenciaFim(competencia: string) {
  const [ano, mes] = competencia.split("-").map(Number);
  const fim = new Date(Date.UTC(ano, mes, 0));

  return fim.toISOString().slice(0, 10);
}

function codigosRubricasBaseConfigurados() {
  return new Set(
    String(process.env.HORAS_EXTRAS_RUBRICAS_BASE_CONTRACHEQUE ?? "")
      .split(",")
      .map((codigo) => codigo.trim())
      .filter(Boolean),
  );
}

function remuneracaoBaseContracheque(
  contracheque: NonNullable<Awaited<ReturnType<typeof buscarContrachequeSarh>>>,
) {
  const codigos = codigosRubricasBaseConfigurados();

  return selecionarBaseRemuneratoriaContracheque(contracheque.rubricas, codigos);
}

function montarPayloadRemuneratorio(
  contracheque: NonNullable<
    Awaited<ReturnType<typeof buscarContrachequeSarh>>
  >,
  base: ReturnType<typeof remuneracaoBaseContracheque>,
) {
  const rubricasRendimento = base.rubricasUsadas
    .map((rubrica) => ({
      codigo: rubrica.codigo,
      sequencial: rubrica.sequencial,
      descricao: rubrica.descricao,
      valor: rubrica.valor,
      prazo: rubrica.prazo,
    }));

  return {
    fonte: contracheque.fonte,
    competencia: contracheque.competencia,
    documento: {
      id: contracheque.documento.id,
      chaveFolha: contracheque.documento.chaveFolha.toISOString(),
      sequdepe: contracheque.documento.sequdepe,
      sequpa: contracheque.documento.sequpa,
      descricao: contracheque.documento.descricao,
    },
    cabecalho: {
      cargo: contracheque.cabecalho.cargo,
      funcao: contracheque.cabecalho.funcao,
      lotacao: contracheque.cabecalho.lotacao,
      orgao: contracheque.cabecalho.orgao,
      referencia: contracheque.cabecalho.referencia,
      tipoServidor: contracheque.cabecalho.tipoServidor,
    },
    totais: {
      bruto: contracheque.totais.bruto,
    },
    criterioBaseRemuneratoria: base.criterio,
    criterioVigencia: "COMPETENCIA_MENSAL_NAO_COMPROVA_VIGENCIA_DIARIA",
    rubricasBaseConfiguradas: [...codigosRubricasBaseConfigurados()],
    rubricasRendimento,
  };
}

export class ContrachequeSarhRemuneracaoProvider
  implements RemuneracaoProvider
{
  async obterVigenciasRemuneratorias(
    input: ObterVigenciasRemuneratoriasInput,
  ): Promise<VigenciaRemuneratoriaComSnapshot[]> {
    const servidor = await prisma.servidor.findFirst({
      where: {
        id: input.servidorId,
        orgaoId: input.orgaoId,
      },
      select: {
        matricula: true,
      },
    });

    if (!servidor) {
      throw new RemuneracaoIndisponivelError(
        "Servidor nao localizado para consulta de remuneracao no SARH.",
      );
    }

    const documentos = await listarDocumentosContrachequeSarh({
      matricula: servidor.matricula,
      competencia: input.competencia,
      orgaoId: input.orgaoId,
    });
    const documentoPreferencial =
      documentos.find((documento) =>
        documento.descricao.toUpperCase().includes("NORMAL"),
      ) ?? documentos[0];
    const contracheque = await buscarContrachequeSarh({
      matricula: servidor.matricula,
      competencia: input.competencia,
      documentoId: documentoPreferencial?.id,
      orgaoId: input.orgaoId,
    });

    if (!contracheque) {
      throw new RemuneracaoIndisponivelError(
        `Contracheque SARH nao localizado para ${servidor.matricula} em ${input.competencia}.`,
      );
    }

    const base = remuneracaoBaseContracheque(contracheque);
    const remuneracaoBaseCentavos = base.centavos;

    if (remuneracaoBaseCentavos <= 0) {
      throw new RemuneracaoIndisponivelError(
        `Contracheque SARH sem remuneracao-base para ${servidor.matricula} em ${input.competencia}.`,
      );
    }

    return [
      {
        id: `SARH:${contracheque.documento.id}`,
        inicio: competenciaInicio(input.competencia),
        fim: competenciaFim(input.competencia),
        remuneracaoBaseCentavos,
        origem: "SARH",
        fonteDocumento: contracheque.documento.descricao,
        consultadoEm: contracheque.consultadoEm,
        payload: montarPayloadRemuneratorio(contracheque, base),
      },
    ];
  }
}
