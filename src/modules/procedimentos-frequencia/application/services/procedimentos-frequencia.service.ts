import type { PrismaClient } from "@/generated/prisma/client";

import { prisma } from "@/shared/infrastructure/database/prisma";

import { PROCEDIMENTOS_FREQUENCIA_PADRAO } from "../../domain/procedimentos-frequencia.defaults";

type Tx = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export const PERMISSOES_PROCEDIMENTOS_FREQUENCIA = [
  "procedimentos-frequencia:consultar:seccional",
  "procedimentos-frequencia:gerenciar:seccional",
  "procedimentos-frequencia:executar:seccional",
  "procedimentos-frequencia:autorizar:seccional",
  "procedimentos-frequencia:emitir-nada-consta:seccional",
  "procedimentos-frequencia:consultar:global",
  "procedimentos-frequencia:gerenciar:global",
  "procedimentos-frequencia:executar:global",
  "procedimentos-frequencia:autorizar:global",
  "procedimentos-frequencia:emitir-nada-consta:global",
] as const;

export async function garantirProcedimentosPadraoFrequenciaOrgao(
  orgaoId: string,
  tx: Tx = prisma,
) {
  for (const [index, procedimento] of PROCEDIMENTOS_FREQUENCIA_PADRAO.entries()) {
    await tx.procedimentoAdministrativoFrequencia.upsert({
      where: {
        orgaoId_codigo: {
          orgaoId,
          codigo: procedimento.codigo,
        },
      },
      update: {
        nome: procedimento.nome,
        categoria: procedimento.categoria as never,
        objetivoFinal: procedimento.objetivoFinal,
        descricao: procedimento.descricao,
        efeitosEsperados: procedimento.efeitosEsperados,
        checklist: procedimento.checklist,
        ordem: index + 1,
      },
      create: {
        orgaoId,
        codigo: procedimento.codigo,
        nome: procedimento.nome,
        categoria: procedimento.categoria as never,
        objetivoFinal: procedimento.objetivoFinal,
        descricao: procedimento.descricao,
        requerProcessoSei: procedimento.requerProcessoSei,
        requerCienciaGestor: procedimento.requerCienciaGestor,
        requerAutoridade: procedimento.requerAutoridade,
        requerAnexo: procedimento.requerAnexo,
        permiteBancoAberto: procedimento.permiteBancoAberto,
        permiteBancoFechado: procedimento.permiteBancoFechado,
        preservaHistoricoOriginal: procedimento.preservaHistoricoOriginal,
        permiteRecalculo: procedimento.permiteRecalculo,
        permiteLancamentoCompetenciaPosterior:
          procedimento.permiteLancamentoCompetenciaPosterior,
        mesesRetroatividadeLivre: procedimento.mesesRetroatividadeLivre,
        permissaoExecutar: procedimento.permissaoExecutar,
        permissaoAutorizar: procedimento.permissaoAutorizar,
        efeitosEsperados: procedimento.efeitosEsperados,
        checklist: procedimento.checklist,
        ordem: index + 1,
      },
    });
  }
}

export function coberturaProcedimentoFrequencia(categoria: string) {
  const cobertura: Record<
    string,
    {
      nivel: "atendido" | "parcial" | "configuracao";
      descricao: string;
    }
  > = {
    JORNADA_DIARIA: {
      nivel: "atendido",
      descricao:
        "Atendido pela jornada vigente, regulamentação do ponto, apuração diária e recálculo.",
    },
    HORA_EXTRA: {
      nivel: "atendido",
      descricao:
        "Atendido pelo módulo de horas extras com política, workflow, execução e folha.",
    },
    COMPENSACAO_SALDO: {
      nivel: "atendido",
      descricao:
        "Atendido por solicitações, autorizações e movimentos de banco de horas.",
    },
    ALTERACAO_TEMPORARIA_JORNADA: {
      nivel: "atendido",
      descricao:
        "Atendido por vínculo temporal de jornada ao servidor com fundamento documental.",
    },
    AFASTAMENTO_INFORMATIVO: {
      nivel: "configuracao",
      descricao:
        "Depende de parametrização do efeito do afastamento: informativo, compensável ou abonável.",
    },
    JORNADA_ESPECIAL: {
      nivel: "atendido",
      descricao:
        "Atendido por jornada especial/reduzida com vigência e recálculo do período.",
    },
    AJUSTE_BANCO_ABERTO: {
      nivel: "atendido",
      descricao:
        "Atendido por ajuste, solicitação deferida e recálculo em competência aberta.",
    },
    AJUSTE_BANCO_FECHADO: {
      nivel: "configuracao",
      descricao:
        "Atendido por procedimento controlado: preserva histórico e lança impacto em competência posterior.",
    },
    TRABALHO_REMOTO: {
      nivel: "atendido",
      descricao:
        "Atendido por regra de trabalho remoto/dispensa e reflexo no espelho.",
    },
    CONVERSAO_HORAS_NAO_AUTORIZADAS: {
      nivel: "configuracao",
      descricao:
        "Atendido por conversão administrativa vinculada ao procedimento e autorização.",
    },
    NADA_CONSTA: {
      nivel: "configuracao",
      descricao:
        "Atendido por emissão administrativa consolidada a partir de saldo, pendências e homologações.",
    },
  };

  return (
    cobertura[categoria] ?? {
      nivel: "configuracao" as const,
      descricao: "Depende dos parâmetros definidos pela seccional.",
    }
  );
}

