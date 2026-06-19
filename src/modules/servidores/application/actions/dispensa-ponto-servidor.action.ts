"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { PeriodoHomologadoError } from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";
import { recalcularMesServidorService } from "@/modules/recalculo/application/services/recalcular-mes-servidor.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  dispensaPontoServidorSchema,
  encerrarDispensaPontoServidorSchema,
  type DispensaPontoServidorFormState,
  type EncerrarDispensaPontoServidorFormState,
} from "../schemas/dispensa-ponto-servidor.schema";

function normalizarDataFormulario(valor: string) {
  return new Date(`${valor}T00:00:00`);
}

function dataAtualFormulario() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
  }).format(new Date());
}

function extrairDadosDispensa(servidorId: string, formData: FormData) {
  const valoresFrequenciaManual = formData.getAll("exigeFrequenciaManual");

  return {
    servidorId,
    motivo: String(formData.get("motivo") ?? ""),
    atoAutorizativo: String(formData.get("atoAutorizativo") ?? ""),
    processoSei: String(formData.get("processoSei") ?? ""),
    observacao: String(formData.get("observacao") ?? ""),
    dataInicio: String(formData.get("dataInicio") ?? ""),
    dataFim: String(formData.get("dataFim") ?? ""),
    exigeFrequenciaManual: valoresFrequenciaManual.includes("true"),
  };
}

async function existeDispensaSobreposta(params: {
  servidorId: string;
  dataInicio: Date;
  dataFim: Date | null;
  ignorarId?: string;
}) {
  return prisma.dispensaPontoServidor.findFirst({
    where: {
      servidorId: params.servidorId,
      status: "ATIVO",
      ...(params.ignorarId
        ? {
            id: {
              not: params.ignorarId,
            },
          }
        : {}),
      dataInicio: {
        lte: params.dataFim ?? new Date("9999-12-31T00:00:00"),
      },
      OR: [
        {
          dataFim: null,
        },
        {
          dataFim: {
            gte: params.dataInicio,
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });
}

function listarCompetenciasPeriodo(dataInicio: Date, dataFim: Date | null) {
  const hoje = normalizarDataFormulario(dataAtualFormulario());
  const fimEfetivo = dataFim ?? (hoje > dataInicio ? hoje : dataInicio);
  const competencias = new Map<
    string,
    { anoReferencia: number; mesReferencia: number }
  >();
  const cursor = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
  const limite = new Date(
    fimEfetivo.getFullYear(),
    fimEfetivo.getMonth(),
    1,
  );

  while (cursor <= limite) {
    const anoReferencia = cursor.getFullYear();
    const mesReferencia = cursor.getMonth() + 1;

    competencias.set(`${anoReferencia}-${mesReferencia}`, {
      anoReferencia,
      mesReferencia,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return [...competencias.values()];
}

async function recalcularDispensaNoEspelho(params: {
  servidorId: string;
  dataInicio: Date;
  dataFim: Date | null;
  usuarioIdAuditoria: string;
  origem: string;
}) {
  let periodosHomologadosIgnorados = 0;

  for (const competencia of listarCompetenciasPeriodo(
    params.dataInicio,
    params.dataFim,
  )) {
    try {
      await recalcularMesServidorService({
        servidorId: params.servidorId,
        ...competencia,
        usuarioIdAuditoria: params.usuarioIdAuditoria,
        origem: params.origem,
      });
    } catch (error) {
      if (error instanceof PeriodoHomologadoError) {
        periodosHomologadosIgnorados += 1;
        continue;
      }

      throw error;
    }
  }

  return {
    periodosHomologadosIgnorados,
  };
}

function revalidarRotasImpactadas(servidorId: string) {
  revalidatePath("/servidores");
  revalidatePath(`/servidores/${servidorId}`);
  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");
  revalidatePath("/dashboard");
}

export async function criarDispensaPontoServidorAction(
  servidorId: string,
  _estadoAnterior: DispensaPontoServidorFormState,
  formData: FormData,
): Promise<DispensaPontoServidorFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "servidores:gerenciar:global",
  );
  const usuarioId = permissao.usuarioId;

  if (!usuarioId) {
    return {
      sucesso: false,
      mensagem: "Nao foi possivel identificar o usuario autenticado.",
    };
  }

  const dados = extrairDadosDispensa(servidorId, formData);
  const parsed = dispensaPontoServidorSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos da dispensa de ponto.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const dataInicio = normalizarDataFormulario(parsed.data.dataInicio);
  const dataFim = parsed.data.dataFim
    ? normalizarDataFormulario(parsed.data.dataFim)
    : null;

  if (dataFim && dataFim < dataInicio) {
    return {
      sucesso: false,
      mensagem: "A data final nao pode ser anterior a data de inicio.",
      erros: {
        dataFim: ["A data final nao pode ser anterior a data de inicio."],
      },
      campos: dados,
    };
  }

  const sobreposta = await existeDispensaSobreposta({
    servidorId,
    dataInicio,
    dataFim,
  });

  if (sobreposta) {
    return {
      sucesso: false,
      mensagem:
        "Ja existe dispensa de ponto ativa em periodo sobreposto para este servidor.",
      erros: {
        dataInicio: ["Periodo sobreposto a uma dispensa ativa."],
      },
      campos: dados,
    };
  }

  const dispensa = await prisma.dispensaPontoServidor.create({
    data: {
      servidorId,
      motivo: parsed.data.motivo,
      atoAutorizativo: parsed.data.atoAutorizativo || null,
      processoSei: parsed.data.processoSei || null,
      observacao: parsed.data.observacao || null,
      exigeFrequenciaManual: parsed.data.exigeFrequenciaManual,
      status: "ATIVO",
      dataInicio,
      dataFim,
      criadoPorUsuarioId: usuarioId,
    },
  });

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId,
      entidade: "DispensaPontoServidor",
      entidadeId: dispensa.id,
      acao: "DISPENSA_PONTO_SERVIDOR_CRIADA",
      dadosDepois: {
        id: dispensa.id,
        servidorId,
        motivo: dispensa.motivo,
        atoAutorizativo: dispensa.atoAutorizativo,
        processoSei: dispensa.processoSei,
        exigeFrequenciaManual: dispensa.exigeFrequenciaManual,
        status: dispensa.status,
        dataInicio: dispensa.dataInicio,
        dataFim: dispensa.dataFim,
      },
    },
  });

  const recalculo = await recalcularDispensaNoEspelho({
    servidorId,
    dataInicio,
    dataFim,
    usuarioIdAuditoria: usuarioId,
    origem: "DISPENSA_PONTO_SERVIDOR_CRIADA",
  });

  revalidarRotasImpactadas(servidorId);

  return {
    sucesso: true,
    mensagem:
      recalculo.periodosHomologadosIgnorados > 0
        ? "Dispensa de ponto registrada. Periodos homologados nao foram recalculados."
        : "Dispensa de ponto registrada com sucesso.",
  };
}

export async function encerrarDispensaPontoServidorAction(
  servidorId: string,
  dispensaId: string,
  _estadoAnterior: EncerrarDispensaPontoServidorFormState,
  formData: FormData,
): Promise<EncerrarDispensaPontoServidorFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "servidores:gerenciar:global",
  );
  const usuarioId = permissao.usuarioId;

  if (!usuarioId) {
    return {
      sucesso: false,
      mensagem: "Nao foi possivel identificar o usuario autenticado.",
    };
  }

  const dados = {
    dataFim: String(formData.get("dataFim") ?? dataAtualFormulario()),
  };
  const parsed = encerrarDispensaPontoServidorSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Informe a data de encerramento.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const dispensaAtual = await prisma.dispensaPontoServidor.findFirst({
    where: {
      id: dispensaId,
      servidorId,
    },
  });

  if (!dispensaAtual) {
    return {
      sucesso: false,
      mensagem: "Dispensa de ponto nao encontrada.",
      campos: dados,
    };
  }

  const dataFim = normalizarDataFormulario(parsed.data.dataFim);

  if (dataFim < dispensaAtual.dataInicio) {
    return {
      sucesso: false,
      mensagem: "A data final nao pode ser anterior a data de inicio.",
      erros: {
        dataFim: ["A data final nao pode ser anterior a data de inicio."],
      },
      campos: dados,
    };
  }

  const dispensa = await prisma.dispensaPontoServidor.update({
    where: {
      id: dispensaId,
    },
    data: {
      status: "INATIVO",
      dataFim,
      encerradoPorUsuarioId: usuarioId,
      encerradoEm: new Date(),
    },
  });

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId,
      entidade: "DispensaPontoServidor",
      entidadeId: dispensa.id,
      acao: "DISPENSA_PONTO_SERVIDOR_ENCERRADA",
      dadosAntes: {
        status: dispensaAtual.status,
        dataFim: dispensaAtual.dataFim,
      },
      dadosDepois: {
        status: dispensa.status,
        dataFim: dispensa.dataFim,
        encerradoEm: dispensa.encerradoEm,
      },
    },
  });

  const recalculo = await recalcularDispensaNoEspelho({
    servidorId,
    dataInicio: dispensaAtual.dataInicio,
    dataFim,
    usuarioIdAuditoria: usuarioId,
    origem: "DISPENSA_PONTO_SERVIDOR_ENCERRADA",
  });

  revalidarRotasImpactadas(servidorId);

  return {
    sucesso: true,
    mensagem:
      recalculo.periodosHomologadosIgnorados > 0
        ? "Dispensa de ponto encerrada. Periodos homologados nao foram recalculados."
        : "Dispensa de ponto encerrada com sucesso.",
  };
}
