"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
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

export async function criarDispensaPontoServidorAction(
  servidorId: string,
  _estadoAnterior: DispensaPontoServidorFormState,
  formData: FormData,
): Promise<DispensaPontoServidorFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "servidores:gerenciar:global",
  );

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
      criadoPorUsuarioId: permissao.usuarioId,
    },
  });

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: permissao.usuarioId,
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

  revalidatePath("/servidores");
  revalidatePath(`/servidores/${servidorId}`);

  return {
    sucesso: true,
    mensagem: "Dispensa de ponto registrada com sucesso.",
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
      encerradoPorUsuarioId: permissao.usuarioId,
      encerradoEm: new Date(),
    },
  });

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: permissao.usuarioId,
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

  revalidatePath("/servidores");
  revalidatePath(`/servidores/${servidorId}`);

  return {
    sucesso: true,
    mensagem: "Dispensa de ponto encerrada com sucesso.",
  };
}
