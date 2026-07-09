"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiAlgumaPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  aceitarRecessoSecadSchema,
  atualizarConvocacaoRecessoSchema,
  convocacaoRecessoSchema,
  convocadoRecessoLoteSchema,
  convocadoRecessoSchema,
  devolverHomologacaoRecessoSchema,
  escolhaRecessoSchema,
  fecharRecessoSchema,
  homologarRecessoSchema,
  recessoForenseSchema,
  type RecessoFormState,
} from "../schemas/recesso-forense.schema";
import {
  resolverEscopoServidoresRecesso,
  servidorEstaNoEscopoRecesso,
} from "../services/escopo-recesso-forense.service";
import { criarDataUtc } from "../services/recesso-forense.service";

const estadoErro = (
  mensagem: string,
  erros?: Record<string, string[]>,
  campos?: Record<string, string | number | null | undefined>,
): RecessoFormState => ({
  sucesso: false,
  mensagem,
  erros,
  campos,
});

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function numero(formData: FormData, campo: string) {
  return Number(formData.get(campo) ?? 0);
}

function jsonArray(formData: FormData, campo: string) {
  const valor = texto(formData, campo);

  if (!valor) {
    return [];
  }

  try {
    const parsed = JSON.parse(valor);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function registrarAuditoria(
  tx: Pick<typeof prisma, "auditoriaEvento">,
  usuarioId: string | undefined,
  entidade: string,
  entidadeId: string,
  acao: string,
  dadosDepois?: unknown,
) {
  await tx.auditoriaEvento.create({
    data: {
      usuarioId,
      entidade,
      entidadeId,
      acao,
      dadosDepois: dadosDepois as object,
    },
  });
}

async function exigirServidorNoEscopoRecesso(
  permissao: {
    usuarioId?: string;
    perfilAtivoCodigo?: string | null;
    permissoes: string[];
  },
  servidorId: string,
) {
  const escopo = await resolverEscopoServidoresRecesso(permissao);

  if (!servidorEstaNoEscopoRecesso(servidorId, escopo.servidorIdsPermitidos)) {
    redirect("/acesso-negado?permissao=recesso%3Aescopo");
  }
}

export async function criarRecessoForenseAction(
  _estadoAnterior: RecessoFormState,
  formData: FormData,
): Promise<RecessoFormState> {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:gerenciar:global",
  ]);

  const dados = {
    ano: numero(formData, "ano"),
    observacao: texto(formData, "observacao"),
  };

  const parsed = recessoForenseSchema.safeParse(dados);

  if (!parsed.success) {
    return estadoErro(
      "Verifique os campos do recesso.",
      parsed.error.flatten().fieldErrors,
      dados,
    );
  }

  const existente = await prisma.recessoForense.findUnique({
    where: { ano: parsed.data.ano },
  });

  if (existente) {
    return estadoErro(
      "Já existe recesso cadastrado para este ano.",
      { ano: ["Já existe recesso cadastrado para este ano."] },
      dados,
    );
  }

  const recesso = await prisma.$transaction(async (tx) => {
    const criado = await tx.recessoForense.create({
      data: {
        ano: parsed.data.ano,
        dataInicio: parsed.data.dataInicio,
        dataFim: parsed.data.dataFim,
        status: "ABERTO",
        observacao: parsed.data.observacao || null,
        criadoPorUsuarioId: permissao.usuarioId,
      },
    });

    await registrarAuditoria(
      tx,
      permissao.usuarioId,
      "RecessoForense",
      criado.id,
      "RECESSO_FORENSE_CRIADO",
      criado,
    );

    return criado;
  });

  revalidatePath("/recesso-forense");
  redirect(`/recesso-forense/${recesso.id}`);
}

export async function criarConvocacaoRecessoAction(
  _estadoAnterior: RecessoFormState,
  formData: FormData,
): Promise<RecessoFormState> {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:convocacao:gerenciar",
    "recesso:gerenciar:global",
  ]);

  const dados = {
    recessoId: texto(formData, "recessoId"),
    numeroPortaria: texto(formData, "numeroPortaria"),
    dataPortaria: texto(formData, "dataPortaria"),
    unidadeId: texto(formData, "unidadeId"),
    chefiaResponsavelId: texto(formData, "chefiaResponsavelId"),
    descricao: texto(formData, "descricao"),
  };

  const parsed = convocacaoRecessoSchema.safeParse(dados);

  if (!parsed.success) {
    return estadoErro(
      "Verifique os campos da convocação.",
      parsed.error.flatten().fieldErrors,
      dados,
    );
  }

  const convocacao = await prisma.$transaction(async (tx) => {
    const criada = await tx.convocacaoRecesso.create({
      data: {
        recessoId: parsed.data.recessoId,
        numeroPortaria: parsed.data.numeroPortaria,
        dataPortaria: parsed.data.dataPortaria
          ? criarDataUtc(parsed.data.dataPortaria)
          : null,
        unidadeId: parsed.data.unidadeId || null,
        chefiaResponsavelId: parsed.data.chefiaResponsavelId || null,
        descricao: parsed.data.descricao || null,
        status: "PUBLICADA",
        publicadoEm: new Date(),
        criadoPorUsuarioId: permissao.usuarioId,
      },
    });

    await tx.recessoForense.update({
      where: { id: parsed.data.recessoId },
      data: { status: "EM_CONVOCACAO" },
    });

    await registrarAuditoria(
      tx,
      permissao.usuarioId,
      "ConvocacaoRecesso",
      criada.id,
      "CONVOCACAO_RECESSO_CRIADA",
      criada,
    );

    return criada;
  });

  revalidatePath(`/recesso-forense/${parsed.data.recessoId}`);
  redirect(`/recesso-forense/${parsed.data.recessoId}/convocacoes?convocacao=${convocacao.id}`);
}

export async function atualizarConvocacaoRecessoAction(
  _estadoAnterior: RecessoFormState,
  formData: FormData,
): Promise<RecessoFormState> {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:convocacao:gerenciar",
    "recesso:gerenciar:global",
  ]);

  const dados = {
    convocacaoId: texto(formData, "convocacaoId"),
    recessoId: texto(formData, "recessoId"),
    numeroPortaria: texto(formData, "numeroPortaria"),
    dataPortaria: texto(formData, "dataPortaria"),
    unidadeId: texto(formData, "unidadeId"),
    chefiaResponsavelId: texto(formData, "chefiaResponsavelId"),
    descricao: texto(formData, "descricao"),
  };

  const parsed = atualizarConvocacaoRecessoSchema.safeParse(dados);

  if (!parsed.success) {
    return estadoErro(
      "Verifique os campos da convocação.",
      parsed.error.flatten().fieldErrors,
      dados,
    );
  }

  const existente = await prisma.convocacaoRecesso.findFirst({
    where: {
      id: parsed.data.convocacaoId,
      recessoId: parsed.data.recessoId,
    },
  });

  if (!existente) {
    return estadoErro("A portaria informada não pertence a este recesso.");
  }

  if (existente.status === "CANCELADA") {
    return estadoErro("Uma portaria cancelada não pode ser atualizada.");
  }

  const atualizada = await prisma.$transaction(async (tx) => {
    const registro = await tx.convocacaoRecesso.update({
      where: { id: existente.id },
      data: {
        numeroPortaria: parsed.data.numeroPortaria,
        dataPortaria: parsed.data.dataPortaria
          ? criarDataUtc(parsed.data.dataPortaria)
          : null,
        unidadeId: parsed.data.unidadeId || null,
        chefiaResponsavelId: parsed.data.chefiaResponsavelId || null,
        descricao: parsed.data.descricao || null,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "ConvocacaoRecesso",
        entidadeId: registro.id,
        acao: "CONVOCACAO_RECESSO_ATUALIZADA",
        dadosAntes: existente,
        dadosDepois: registro,
      },
    });

    return registro;
  });

  revalidatePath(`/recesso-forense/${parsed.data.recessoId}`);
  revalidatePath(`/recesso-forense/${parsed.data.recessoId}/convocacoes`);
  redirect(
    `/recesso-forense/${parsed.data.recessoId}/convocacoes?convocacao=${atualizada.id}`,
  );
}

export async function convocarServidorRecessoAction(
  _estadoAnterior: RecessoFormState,
  formData: FormData,
): Promise<RecessoFormState> {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:convocacao:gerenciar",
    "recesso:gerenciar:global",
    "recesso:homologar:chefia",
  ]);

  const dados = {
    recessoId: texto(formData, "recessoId"),
    convocacaoId: texto(formData, "convocacaoId"),
    servidorId: texto(formData, "servidorId"),
    dataConvocacao: texto(formData, "dataConvocacao"),
    minutosPrevistos: numero(formData, "minutosPrevistos"),
    observacao: texto(formData, "observacao"),
    anoRecesso: numero(formData, "anoRecesso"),
  };

  const parsed = convocadoRecessoSchema.safeParse(dados);

  if (!parsed.success) {
    return estadoErro(
      "Verifique os dados do servidor convocado.",
      parsed.error.flatten().fieldErrors,
      dados,
    );
  }

  await exigirServidorNoEscopoRecesso(permissao, parsed.data.servidorId);

  try {
    await prisma.$transaction(async (tx) => {
      const dataConvocacao = criarDataUtc(parsed.data.dataConvocacao);

      const convocado = await tx.convocadoRecesso.create({
        data: {
          recessoId: parsed.data.recessoId,
          convocacaoId: parsed.data.convocacaoId,
          servidorId: parsed.data.servidorId,
          dataConvocacao,
          minutosPrevistos: parsed.data.minutosPrevistos,
          observacao: parsed.data.observacao || null,
        },
      });

      await tx.espelhoRecesso.upsert({
        where: {
          recessoId_servidorId_dataReferencia: {
            recessoId: parsed.data.recessoId,
            servidorId: parsed.data.servidorId,
            dataReferencia: dataConvocacao,
          },
        },
        update: {
          convocadoId: convocado.id,
          status: "CONVOCADO",
          escolha: convocado.escolha,
          minutosTrabalhados: 0,
        },
        create: {
          recessoId: parsed.data.recessoId,
          servidorId: parsed.data.servidorId,
          convocadoId: convocado.id,
          dataReferencia: dataConvocacao,
          status: "CONVOCADO",
          escolha: convocado.escolha,
        },
      });

      await registrarAuditoria(
        tx,
        permissao.usuarioId,
        "ConvocadoRecesso",
        convocado.id,
        "SERVIDOR_CONVOCADO_RECESSO",
        convocado,
      );
    });
  } catch {
    return estadoErro(
      "Servidor já convocado nesta data para a portaria informada.",
      { dataConvocacao: ["Servidor já convocado nesta data."] },
      dados,
    );
  }

  revalidatePath(`/recesso-forense/${parsed.data.recessoId}`);
  revalidatePath(`/recesso-forense/${parsed.data.recessoId}/convocacoes`);

  return {
    sucesso: true,
    mensagem: "Servidor convocado com sucesso.",
  };
}

export async function convocarServidorRecessoEmLoteAction(
  _estadoAnterior: RecessoFormState,
  formData: FormData,
): Promise<RecessoFormState> {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:convocacao:gerenciar",
    "recesso:gerenciar:global",
    "recesso:homologar:chefia",
  ]);

  const dados = {
    recessoId: texto(formData, "recessoId"),
    convocacaoId: texto(formData, "convocacaoId"),
    servidorId: texto(formData, "servidorId"),
    minutosPrevistos: numero(formData, "minutosPrevistos"),
    observacao: texto(formData, "observacao"),
    anoRecesso: numero(formData, "anoRecesso"),
    diasConvocados: jsonArray(formData, "diasConvocados"),
  };

  const parsed = convocadoRecessoLoteSchema.safeParse(dados);

  if (!parsed.success) {
    return estadoErro(
      "Verifique os dados da convocação em lote.",
      parsed.error.flatten().fieldErrors,
      {
        recessoId: dados.recessoId,
        convocacaoId: dados.convocacaoId,
        servidorId: dados.servidorId,
        minutosPrevistos: dados.minutosPrevistos,
        observacao: dados.observacao,
        anoRecesso: dados.anoRecesso,
      },
    );
  }

  await exigirServidorNoEscopoRecesso(permissao, parsed.data.servidorId);

  const convocados = await prisma.$transaction(async (tx) => {
    const registros = [];
    const datasSelecionadas = parsed.data.diasConvocados.map((dia) =>
      criarDataUtc(dia.dataConvocacao),
    );

    const convocadosRemovidos = await tx.convocadoRecesso.findMany({
      where: {
        recessoId: parsed.data.recessoId,
        convocacaoId: parsed.data.convocacaoId,
        servidorId: parsed.data.servidorId,
        dataConvocacao: {
          notIn: datasSelecionadas,
        },
      },
      select: {
        id: true,
      },
    });

    if (convocadosRemovidos.length > 0) {
      const convocadosRemovidosIds = convocadosRemovidos.map((item) => item.id);

      await tx.espelhoRecesso.deleteMany({
        where: {
          convocadoId: {
            in: convocadosRemovidosIds,
          },
        },
      });

      await tx.convocadoRecesso.deleteMany({
        where: {
          id: {
            in: convocadosRemovidosIds,
          },
        },
      });
    }

    for (const dia of parsed.data.diasConvocados) {
      const dataConvocacao = criarDataUtc(dia.dataConvocacao);

      const convocado = await tx.convocadoRecesso.upsert({
        where: {
          convocacaoId_servidorId_dataConvocacao: {
            convocacaoId: parsed.data.convocacaoId,
            servidorId: parsed.data.servidorId,
            dataConvocacao,
          },
        },
        update: {
          escolha: dia.escolha,
          minutosPrevistos: parsed.data.minutosPrevistos,
          observacao: parsed.data.observacao || null,
        },
        create: {
          recessoId: parsed.data.recessoId,
          convocacaoId: parsed.data.convocacaoId,
          servidorId: parsed.data.servidorId,
          dataConvocacao,
          escolha: dia.escolha,
          minutosPrevistos: parsed.data.minutosPrevistos,
          observacao: parsed.data.observacao || null,
        },
      });

      await tx.espelhoRecesso.upsert({
        where: {
          recessoId_servidorId_dataReferencia: {
            recessoId: parsed.data.recessoId,
            servidorId: parsed.data.servidorId,
            dataReferencia: dataConvocacao,
          },
        },
        update: {
          convocadoId: convocado.id,
          status: "CONVOCADO",
          escolha: convocado.escolha,
          minutosTrabalhados: 0,
        },
        create: {
          recessoId: parsed.data.recessoId,
          servidorId: parsed.data.servidorId,
          convocadoId: convocado.id,
          dataReferencia: dataConvocacao,
          status: "CONVOCADO",
          escolha: convocado.escolha,
        },
      });

      registros.push(convocado);
    }

    await registrarAuditoria(
      tx,
      permissao.usuarioId,
      "ConvocacaoRecesso",
      parsed.data.convocacaoId,
      "SERVIDOR_CONVOCADO_RECESSO_LOTE",
      {
        recessoId: parsed.data.recessoId,
        servidorId: parsed.data.servidorId,
        totalDias: registros.length,
        totalDiasRemovidos: convocadosRemovidos.length,
        datas: registros.map((item) => ({
          id: item.id,
          dataConvocacao: item.dataConvocacao,
          escolha: item.escolha,
        })),
      },
    );

    return registros;
  });

  revalidatePath(`/recesso-forense/${parsed.data.recessoId}`);
  revalidatePath(`/recesso-forense/${parsed.data.recessoId}/convocacoes`);
  revalidatePath(`/recesso-forense/${parsed.data.recessoId}/espelho`);

  return {
    sucesso: true,
    mensagem: `${convocados.length} data(s) de convocação salvas com sucesso.`,
  };
}

export async function escolherCompensacaoRecessoAction(formData: FormData) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:fechar:proprio",
    "recesso:gerenciar:global",
  ]);

  const parsed = escolhaRecessoSchema.parse({
    convocadoId: texto(formData, "convocadoId"),
    escolha: texto(formData, "escolha"),
  });

  const podeGerenciar = usuarioPossuiAlgumaPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    ["recesso:gerenciar:global"],
  );

  const servidorSessao = permissao.usuarioId
    ? await prisma.servidor.findUnique({ where: { usuarioId: permissao.usuarioId } })
    : null;

  const convocadoAtual = await prisma.convocadoRecesso.findUnique({
    where: { id: parsed.convocadoId },
  });

  if (
    !convocadoAtual ||
    (!podeGerenciar && convocadoAtual.servidorId !== servidorSessao?.id)
  ) {
    redirect("/acesso-negado?permissao=recesso%3Afechar%3Aproprio");
  }

  const convocado = await prisma.$transaction(async (tx) => {
    const atualizado = await tx.convocadoRecesso.update({
      where: { id: parsed.convocadoId },
      data: { escolha: parsed.escolha },
    });

    await tx.espelhoRecesso.updateMany({
      where: { convocadoId: atualizado.id },
      data: { escolha: parsed.escolha },
    });

    await registrarAuditoria(
      tx,
      permissao.usuarioId,
      "ConvocadoRecesso",
      atualizado.id,
      "ESCOLHA_RECESSO_ALTERADA",
      atualizado,
    );

    return atualizado;
  });

  revalidatePath(`/recesso-forense/${convocado.recessoId}`);
}

export async function fecharRecessoServidorAction(formData: FormData) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:fechar:proprio",
    "recesso:gerenciar:global",
  ]);

  const parsed = fecharRecessoSchema.parse({
    recessoId: texto(formData, "recessoId"),
    servidorId: texto(formData, "servidorId"),
    mesReferencia: numero(formData, "mesReferencia"),
    observacaoServidor: texto(formData, "observacaoServidor"),
  });

  const podeGerenciar = usuarioPossuiAlgumaPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    ["recesso:gerenciar:global"],
  );

  const servidorSessao = permissao.usuarioId
    ? await prisma.servidor.findUnique({ where: { usuarioId: permissao.usuarioId } })
    : null;

  if (!podeGerenciar && parsed.servidorId !== servidorSessao?.id) {
    redirect("/acesso-negado?permissao=recesso%3Afechar%3Aproprio");
  }

  const homologacao = await prisma.$transaction(async (tx) => {
    const convocados = await tx.convocadoRecesso.findMany({
      where: {
        recessoId: parsed.recessoId,
        servidorId: parsed.servidorId,
      },
    });

    const convocadosMes = convocados.filter(
      (convocado) => convocado.dataConvocacao.getUTCMonth() + 1 === parsed.mesReferencia,
    );

    const resumo = {
      total: convocadosMes.length,
      pecunia: convocadosMes.filter((item) => item.escolha === "PECUNIA").length,
      folga: convocadosMes.filter((item) => item.escolha === "FOLGA").length,
      minutos: convocadosMes.reduce(
        (total, item) => total + item.minutosTrabalhados,
        0,
      ),
    };

    const criado = await tx.homologacaoRecesso.upsert({
      where: {
        recessoId_servidorId_mesReferencia: {
          recessoId: parsed.recessoId,
          servidorId: parsed.servidorId,
          mesReferencia: parsed.mesReferencia,
        },
      },
      update: {
        status: "PENDENTE",
        totalDiasConvocados: resumo.total,
        diasPecunia: resumo.pecunia,
        diasFolga: resumo.folga,
        minutosTrabalhados: resumo.minutos,
        observacaoServidor: parsed.observacaoServidor || null,
      },
      create: {
        recessoId: parsed.recessoId,
        servidorId: parsed.servidorId,
        mesReferencia: parsed.mesReferencia,
        status: "PENDENTE",
        totalDiasConvocados: resumo.total,
        diasPecunia: resumo.pecunia,
        diasFolga: resumo.folga,
        minutosTrabalhados: resumo.minutos,
        observacaoServidor: parsed.observacaoServidor || null,
      },
    });

    await tx.convocadoRecesso.updateMany({
      where: {
        recessoId: parsed.recessoId,
        servidorId: parsed.servidorId,
        dataConvocacao: {
          in: convocadosMes.map((item) => item.dataConvocacao),
        },
      },
      data: {
        status: "FECHADO",
        fechadoPorUsuarioId: permissao.usuarioId,
        fechadoEm: new Date(),
      },
    });

    await tx.espelhoRecesso.updateMany({
      where: {
        recessoId: parsed.recessoId,
        servidorId: parsed.servidorId,
        dataReferencia: {
          in: convocadosMes.map((item) => item.dataConvocacao),
        },
      },
      data: { status: "FECHADO" },
    });

    await registrarAuditoria(
      tx,
      permissao.usuarioId,
      "HomologacaoRecesso",
      criado.id,
      "RECESSO_SERVIDOR_FECHADO",
      criado,
    );

    return criado;
  });

  revalidatePath(`/recesso-forense/${parsed.recessoId}`);
  redirect(`/recesso-forense/${parsed.recessoId}/homologacao?homologacao=${homologacao.id}`);
}

export async function homologarRecessoAction(formData: FormData) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:homologar:chefia",
    "recesso:gerenciar:global",
  ]);

  const parsed = homologarRecessoSchema.parse({
    homologacaoId: texto(formData, "homologacaoId"),
    observacaoChefia: texto(formData, "observacaoChefia"),
  });

  const homologacaoAtual = await prisma.homologacaoRecesso.findUnique({
    where: { id: parsed.homologacaoId },
    select: { servidorId: true },
  });

  if (!homologacaoAtual) {
    redirect("/acesso-negado?permissao=recesso%3Ahomologar%3Achefia");
  }

  await exigirServidorNoEscopoRecesso(permissao, homologacaoAtual.servidorId);

  const homologacao = await prisma.$transaction(async (tx) => {
    const atualizada = await tx.homologacaoRecesso.update({
      where: { id: parsed.homologacaoId },
      data: {
        status: "HOMOLOGADO",
        observacaoChefia: parsed.observacaoChefia || null,
        homologadoPorUsuarioId: permissao.usuarioId,
        homologadoEm: new Date(),
      },
    });

    await tx.convocadoRecesso.updateMany({
      where: {
        recessoId: atualizada.recessoId,
        servidorId: atualizada.servidorId,
      },
      data: { status: "HOMOLOGADO" },
    });

    await tx.espelhoRecesso.updateMany({
      where: {
        recessoId: atualizada.recessoId,
        servidorId: atualizada.servidorId,
      },
      data: { status: "HOMOLOGADO" },
    });

    await registrarAuditoria(
      tx,
      permissao.usuarioId,
      "HomologacaoRecesso",
      atualizada.id,
      "RECESSO_HOMOLOGADO_CHEFIA",
      atualizada,
    );

    return atualizada;
  });

  revalidatePath(`/recesso-forense/${homologacao.recessoId}/homologacao`);
}

export async function devolverHomologacaoRecessoAction(formData: FormData) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:homologar:chefia",
    "recesso:gerenciar:global",
  ]);

  const parsed = devolverHomologacaoRecessoSchema.parse({
    homologacaoId: texto(formData, "homologacaoId"),
    observacaoChefia: texto(formData, "observacaoChefia"),
  });

  const homologacaoAtual = await prisma.homologacaoRecesso.findUnique({
    where: { id: parsed.homologacaoId },
    select: { servidorId: true },
  });

  if (!homologacaoAtual) {
    redirect("/acesso-negado?permissao=recesso%3Ahomologar%3Achefia");
  }

  await exigirServidorNoEscopoRecesso(permissao, homologacaoAtual.servidorId);

  const homologacao = await prisma.$transaction(async (tx) => {
    const atualizada = await tx.homologacaoRecesso.update({
      where: { id: parsed.homologacaoId },
      data: {
        status: "DEVOLVIDO",
        observacaoChefia: parsed.observacaoChefia || null,
      },
    });

    await tx.convocadoRecesso.updateMany({
      where: {
        recessoId: atualizada.recessoId,
        servidorId: atualizada.servidorId,
      },
      data: { status: "DEVOLVIDO" },
    });

    await registrarAuditoria(
      tx,
      permissao.usuarioId,
      "HomologacaoRecesso",
      atualizada.id,
      "RECESSO_DEVOLVIDO_CHEFIA",
      atualizada,
    );

    return atualizada;
  });

  revalidatePath(`/recesso-forense/${homologacao.recessoId}/homologacao`);
}

export async function aceitarRecessoSecadAction(formData: FormData) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:aceitar:secad",
    "recesso:gerenciar:global",
  ]);

  const parsed = aceitarRecessoSecadSchema.parse({
    homologacaoId: texto(formData, "homologacaoId"),
    observacaoSecad: texto(formData, "observacaoSecad"),
  });

  const homologacao = await prisma.$transaction(async (tx) => {
    const atualizada = await tx.homologacaoRecesso.update({
      where: { id: parsed.homologacaoId },
      data: {
        status: "ACEITO_SECAD",
        observacaoSecad: parsed.observacaoSecad || null,
        aceitoSecadPorUsuarioId: permissao.usuarioId,
        aceitoSecadEm: new Date(),
      },
    });

    await tx.convocadoRecesso.updateMany({
      where: {
        recessoId: atualizada.recessoId,
        servidorId: atualizada.servidorId,
      },
      data: { status: "ACEITO_SECAD" },
    });

    await tx.espelhoRecesso.updateMany({
      where: {
        recessoId: atualizada.recessoId,
        servidorId: atualizada.servidorId,
      },
      data: { status: "ACEITO_SECAD" },
    });

    await registrarAuditoria(
      tx,
      permissao.usuarioId,
      "HomologacaoRecesso",
      atualizada.id,
      "RECESSO_ACEITO_SECAD",
      atualizada,
    );

    return atualizada;
  });

  revalidatePath(`/recesso-forense/${homologacao.recessoId}/homologacao`);
}

export async function fecharRecessoForenseAction(formData: FormData) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:gerenciar:global",
  ]);

  const recessoId = texto(formData, "recessoId");

  const recesso = await prisma.$transaction(async (tx) => {
    const atualizado = await tx.recessoForense.update({
      where: { id: recessoId },
      data: {
        status: "FECHADO",
        fechadoPorUsuarioId: permissao.usuarioId,
        fechadoEm: new Date(),
      },
    });

    await registrarAuditoria(
      tx,
      permissao.usuarioId,
      "RecessoForense",
      atualizado.id,
      "RECESSO_FORENSE_FECHADO",
      atualizado,
    );

    return atualizado;
  });

  revalidatePath("/recesso-forense");
  revalidatePath(`/recesso-forense/${recesso.id}`);
}
