"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { Prisma, type StatusProgramacaoFerias } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  buscarProgramacaoFeriasPorId,
  buscarSaldoFeriasServidor,
  buscarServidorFeriasPorUsuarioId,
  existePeriodoPosteriorNaoUsufruido,
  existeConflitoProgramacaoServidor,
  listarPeriodosFeriasAtivosServidor,
  somarDiasLicencaPropriaSaudeServidor,
  usuarioPodeAnalisarProgramacaoFerias,
} from "../../infrastructure/repositories/programacao-ferias.repository";
import { enviarProgramacaoFeriasSarh } from "../services/enviar-programacao-ferias-sarh.service";
import {
  dataIsoParaUtc,
  diferencaDiasCalendarioUtc,
  diasEntreDatasUtc,
  programacaoFeriasPodeEditar,
  programacaoFeriasPodeExecutarSarh,
  subtrairDiasUteisInstitucionais,
} from "../services/programacao-ferias-status.service";

function texto(formData: FormData, chave: string) {
  return String(formData.get(chave) ?? "").trim();
}

function numero(formData: FormData, chave: string) {
  const valor = Number(texto(formData, chave));
  return Number.isInteger(valor) ? valor : null;
}

function voltarComMensagem(
  path: string,
  mensagem: string,
  tipo: "ok" | "erro" = "ok",
): never {
  const params = new URLSearchParams({ [tipo]: mensagem });
  redirect(`${path}?${params.toString()}`);
}

function revalidarFerias() {
  revalidatePath("/minhas-ferias");
  revalidatePath("/minha-equipe/ferias");
  revalidatePath("/minha-equipe/ferias/solicitacoes");
  revalidatePath("/administracao/ferias/integracao-sarh");
}

async function registrarEvento(params: {
  tx: Pick<typeof prisma, "programacaoFeriasEvento">;
  programacaoId: string;
  usuarioId?: string | null;
  statusAnterior?: StatusProgramacaoFerias | null;
  statusNovo: StatusProgramacaoFerias;
  descricao: string;
  metadados?: Prisma.InputJsonObject;
}) {
  await params.tx.programacaoFeriasEvento.create({
    data: {
      programacaoId: params.programacaoId,
      usuarioId: params.usuarioId ?? null,
      statusAnterior: params.statusAnterior || null,
      statusNovo: params.statusNovo,
      descricao: params.descricao,
      metadados: params.metadados,
    },
  });
}

async function validarPeriodoSolicitado(params: {
  servidorId: string;
  dataInicio: Date;
  dataFim: Date;
  exercicio: number;
  ignorarProgramacaoId?: string | null;
}) {
  const dias = diasEntreDatasUtc(params.dataInicio, params.dataFim);

  if (dias <= 0) {
    return "A data final deve ser igual ou posterior a data inicial.";
  }

  const [saldo, periodosAtivos, diasLicencaPropriaSaude] = await Promise.all([
    buscarSaldoFeriasServidor({
      servidorId: params.servidorId,
      exercicio: params.exercicio,
      ignorarProgramacaoId: params.ignorarProgramacaoId,
    }),
    listarPeriodosFeriasAtivosServidor({
      servidorId: params.servidorId,
      exercicio: params.exercicio,
      ignorarProgramacaoId: params.ignorarProgramacaoId,
    }),
    somarDiasLicencaPropriaSaudeServidor(params.servidorId),
  ]);

  if (saldo.diasDisponiveis < dias) {
    return `Saldo insuficiente para o exercício ${params.exercicio}. Disponível: ${saldo.diasDisponiveis} dia(s).`;
  }

  if (diasLicencaPropriaSaude > 730) {
    return "Há registro de mais de 730 dias de licença para tratamento da própria saúde. A programação deste caso excepcional deve ser feita via SEI pela SECAP/DICAP.";
  }

  if (periodosAtivos.length >= 3) {
    return `O exercício ${params.exercicio} já possui três períodos de férias ativos. Cancele um período editável antes de marcar outro.`;
  }

  const conflito = await existeConflitoProgramacaoServidor({
    servidorId: params.servidorId,
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
    ignorarProgramacaoId: params.ignorarProgramacaoId,
  });

  if (conflito) {
    return "Já existe férias ou programação ativa nesse período.";
  }

  const periodosComSolicitado = [
    ...periodosAtivos,
    {
      id: "solicitado",
      origem: "SECP" as const,
      dataInicio: params.dataInicio,
      dataFim: params.dataFim,
      dias,
      exercicio: params.exercicio,
      status: "SOLICITADO",
    },
  ].sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime());
  const indiceSolicitado = periodosComSolicitado.findIndex(
    (periodo) => periodo.id === "solicitado",
  );

  for (let indice = 1; indice < periodosComSolicitado.length; indice += 1) {
    const anterior = periodosComSolicitado[indice - 1];
    const atual = periodosComSolicitado[indice];
    const intervalo = diferencaDiasCalendarioUtc(anterior.dataFim, atual.dataInicio) - 1;

    if (intervalo < 10) {
      return `Entre períodos consecutivos do exercício ${params.exercicio} deve haver intervalo mínimo de 10 dias.`;
    }
  }

  const hoje = new Date();
  const diasCorridosAteInicio = diferencaDiasCalendarioUtc(hoje, params.dataInicio);

  if (indiceSolicitado === 0) {
    if (diasCorridosAteInicio < 45) {
      return "O primeiro período do exercício deve ser marcado com antecedência mínima de 45 dias da data de início.";
    }
  } else {
    const dataLimite = await subtrairDiasUteisInstitucionais(
      params.dataInicio,
      2,
      params.servidorId,
    );

    if (diferencaDiasCalendarioUtc(hoje, dataLimite) < 0) {
      return "Os demais períodos devem ser marcados ou alterados até dois dias úteis antes da data de início.";
    }
  }

  return null;
}

export async function criarProgramacaoFeriasAction(formData: FormData) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "programacao-ferias:solicitar:proprio",
  ]);

  if (!permissao.usuarioId) redirect("/login");

  const servidor = await buscarServidorFeriasPorUsuarioId(permissao.usuarioId);
  if (!servidor) {
    voltarComMensagem("/minhas-ferias", "Servidor não localizado.", "erro");
  }

  const exercicio = numero(formData, "exercicio");
  const dataInicioTexto = texto(formData, "dataInicio");
  const dataFimTexto = texto(formData, "dataFim");
  const observacaoServidor = texto(formData, "observacaoServidor");

  if (!exercicio || !dataInicioTexto || !dataFimTexto) {
    voltarComMensagem("/minhas-ferias", "Informe exercício e período das férias.", "erro");
  }

  const dataInicio = dataIsoParaUtc(dataInicioTexto);
  const dataFim = dataIsoParaUtc(dataFimTexto);
  const erro = await validarPeriodoSolicitado({
    servidorId: servidor.id,
    dataInicio,
    dataFim,
    exercicio,
  });

  if (erro) voltarComMensagem("/minhas-ferias", erro, "erro");

  const dias = diasEntreDatasUtc(dataInicio, dataFim);
  const lotacao = servidor.lotacoes[0];

  const programacao = await prisma.$transaction(async (tx) => {
    const criada = await tx.programacaoFerias.create({
      data: {
        servidorId: servidor.id,
        orgaoId: servidor.orgaoId,
        unidadeId: lotacao?.unidadeId ?? null,
        exercicio,
        dataInicio,
        dataFim,
        dias,
        status: "ENVIADA",
        integracaoStatus: "NAO_APLICAVEL",
        observacaoServidor: observacaoServidor || null,
        solicitadoPorUsuarioId: permissao.usuarioId!,
      },
    });

    await registrarEvento({
      tx,
      programacaoId: criada.id,
      usuarioId: permissao.usuarioId,
      statusNovo: "ENVIADA",
      descricao: "Programação de férias enviada para análise da chefia.",
    });

    return criada;
  });

  revalidarFerias();
  redirect(`/minhas-ferias/${programacao.id}?ok=Programação enviada para análise.`);
}

export async function atualizarProgramacaoFeriasAction(formData: FormData) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "programacao-ferias:solicitar:proprio",
  ]);
  if (!permissao.usuarioId) redirect("/login");

  const id = texto(formData, "id");
  const programacao = await buscarProgramacaoFeriasPorId(id);
  if (!programacao || programacao.servidor.usuarioId !== permissao.usuarioId) {
    voltarComMensagem("/minhas-ferias", "Programação de férias não localizada.", "erro");
  }
  if (!programacaoFeriasPodeEditar(programacao.status)) {
    redirect(`/minhas-ferias/${id}?erro=Esta programação já foi deliberada pela chefia.`);
  }

  const exercicio = numero(formData, "exercicio");
  const dataInicioTexto = texto(formData, "dataInicio");
  const dataFimTexto = texto(formData, "dataFim");
  if (!exercicio || !dataInicioTexto || !dataFimTexto) {
    redirect(`/minhas-ferias/${id}?erro=Informe exercício e período das férias.`);
  }

  const existePosterior = await existePeriodoPosteriorNaoUsufruido({
    servidorId: programacao.servidorId,
    exercicio: programacao.exercicio,
    dataInicioReferencia: programacao.dataInicio,
    ignorarProgramacaoId: id,
  });
  if (existePosterior) {
    redirect(
      `/minhas-ferias/${id}?erro=${encodeURIComponent(
        "Para alterar este período, cancele antes todos os períodos posteriores ainda não usufruídos do mesmo exercício.",
      )}`,
    );
  }

  const dataInicio = dataIsoParaUtc(dataInicioTexto);
  const dataFim = dataIsoParaUtc(dataFimTexto);
  const erro = await validarPeriodoSolicitado({
    servidorId: programacao.servidorId,
    dataInicio,
    dataFim,
    exercicio,
    ignorarProgramacaoId: id,
  });
  if (erro) redirect(`/minhas-ferias/${id}?erro=${encodeURIComponent(erro)}`);

  const statusAnterior = programacao.status;
  const statusNovo = "ENVIADA";
  const dias = diasEntreDatasUtc(dataInicio, dataFim);

  await prisma.$transaction(async (tx) => {
    await tx.programacaoFerias.update({
      where: { id },
      data: {
        exercicio,
        dataInicio,
        dataFim,
        dias,
        status: statusNovo,
        observacaoServidor: texto(formData, "observacaoServidor") || null,
        observacaoChefia: null,
        analisadoPorUsuarioId: null,
        analisadoEm: null,
        atualizadoPorUsuarioId: permissao.usuarioId,
      },
    });
    await registrarEvento({
      tx,
      programacaoId: id,
      usuarioId: permissao.usuarioId,
      statusAnterior,
      statusNovo,
      descricao: "Programação ajustada pelo servidor e reenviada para análise.",
    });
  });

  revalidarFerias();
  redirect(`/minhas-ferias/${id}?ok=Programação atualizada e reenviada.`);
}

export async function excluirProgramacaoFeriasAction(formData: FormData) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "programacao-ferias:solicitar:proprio",
  ]);
  if (!permissao.usuarioId) redirect("/login");

  const id = texto(formData, "id");
  const programacao = await buscarProgramacaoFeriasPorId(id);
  if (!programacao || programacao.servidor.usuarioId !== permissao.usuarioId) {
    voltarComMensagem("/minhas-ferias", "Programação de férias não localizada.", "erro");
  }
  if (!programacaoFeriasPodeEditar(programacao.status)) {
    redirect(`/minhas-ferias/${id}?erro=Esta programação já foi deliberada pela chefia.`);
  }

  const existePosterior = await existePeriodoPosteriorNaoUsufruido({
    servidorId: programacao.servidorId,
    exercicio: programacao.exercicio,
    dataInicioReferencia: programacao.dataInicio,
    ignorarProgramacaoId: id,
  });
  if (existePosterior) {
    redirect(
      `/minhas-ferias/${id}?erro=${encodeURIComponent(
        "Para cancelar este período, cancele antes todos os períodos posteriores ainda não usufruídos do mesmo exercício.",
      )}`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.programacaoFerias.update({
      where: { id },
      data: {
        status: "CANCELADA",
        atualizadoPorUsuarioId: permissao.usuarioId,
      },
    });
    await registrarEvento({
      tx,
      programacaoId: id,
      usuarioId: permissao.usuarioId,
      statusAnterior: programacao.status,
      statusNovo: "CANCELADA",
      descricao: "Programação cancelada pelo servidor antes da deliberação.",
    });
  });

  revalidarFerias();
  redirect("/minhas-ferias?ok=Programação cancelada.");
}

export async function deliberarProgramacaoFeriasAction(formData: FormData) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "programacao-ferias:analisar:subordinados",
  ]);
  if (!permissao.usuarioId) redirect("/login");

  const id = texto(formData, "id");
  const decisao = texto(formData, "decisao");
  const observacaoChefia = texto(formData, "observacaoChefia");
  const programacao = await buscarProgramacaoFeriasPorId(id);

  if (!programacao) {
    voltarComMensagem(
      "/minha-equipe/ferias/solicitacoes",
      "Programação de férias não localizada.",
      "erro",
    );
  }

  const podeAnalisar = await usuarioPodeAnalisarProgramacaoFerias({
    usuarioId: permissao.usuarioId,
    programacaoId: id,
  });
  if (!podeAnalisar) {
    redirect(`/acesso-negado?permissao=programacao-ferias%3Aanalisar%3Asubordinados`);
  }
  if (!programacaoFeriasPodeEditar(programacao.status)) {
    redirect(`/minha-equipe/ferias/solicitacoes/${id}?erro=Esta programação já foi deliberada.`);
  }

  const statusNovo =
    decisao === "aprovar"
      ? "APROVADA_CHEFIA"
      : decisao === "devolver"
        ? "DEVOLVIDA"
        : decisao === "reprovar"
          ? "REPROVADA_CHEFIA"
          : null;

  if (!statusNovo) {
    redirect(`/minha-equipe/ferias/solicitacoes/${id}?erro=Decisão inválida.`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.programacaoFerias.update({
      where: { id },
      data: {
        status: statusNovo,
        integracaoStatus:
          statusNovo === "APROVADA_CHEFIA" ? "PENDENTE" : "NAO_APLICAVEL",
        observacaoChefia: observacaoChefia || null,
        analisadoPorUsuarioId: permissao.usuarioId,
        analisadoEm: new Date(),
      },
    });
    await registrarEvento({
      tx,
      programacaoId: id,
      usuarioId: permissao.usuarioId,
      statusAnterior: programacao.status,
      statusNovo,
      descricao:
        statusNovo === "APROVADA_CHEFIA"
          ? "Programação aprovada pela chefia."
          : statusNovo === "DEVOLVIDA"
            ? "Programação devolvida ao servidor para ajuste."
            : "Programação reprovada pela chefia.",
      metadados: observacaoChefia ? { observacaoChefia } : undefined,
    });
  });

  revalidarFerias();
  redirect(`/minha-equipe/ferias/solicitacoes/${id}?ok=Deliberação registrada.`);
}

export async function executarEnvioProgramacaoFeriasSarhAction(formData: FormData) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "programacao-ferias:executar-sarh:seccional",
    "programacao-ferias:executar-sarh:global",
  ]);
  if (!permissao.usuarioId) redirect("/login");

  const id = texto(formData, "id");
  const programacao = await prisma.programacaoFerias.findUnique({
    where: { id },
    include: { servidor: true },
  });

  if (!programacao) {
    voltarComMensagem(
      "/administracao/ferias/integracao-sarh",
      "Programação de férias não localizada.",
      "erro",
    );
  }

  const podeGlobal = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "programacao-ferias:executar-sarh:global",
  );
  const podeSeccional =
    usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      "programacao-ferias:executar-sarh:seccional",
    ) && (permissao.orgaoIds ?? []).includes(programacao.orgaoId);

  if (!podeGlobal && !podeSeccional) {
    redirect(`/acesso-negado?permissao=programacao-ferias%3Aexecutar-sarh%3Aseccional`);
  }

  if (!programacaoFeriasPodeExecutarSarh(programacao.status)) {
    redirect(`/administracao/ferias/integracao-sarh?erro=Programação sem status de envio ao SARH.`);
  }

  await prisma.programacaoFerias.update({
    where: { id },
    data: {
      status: "ENVIANDO_SARH",
      integracaoStatus: "EM_PROCESSAMENTO",
      enviadoSarhPorUsuarioId: permissao.usuarioId,
      enviadoSarhEm: new Date(),
      integracaoErro: null,
    },
  });

  const resultado = await enviarProgramacaoFeriasSarh(programacao);
  const statusNovo = resultado.sucesso ? "ENVIADA_SARH" : "ERRO_ENVIO_SARH";

  await prisma.$transaction(async (tx) => {
    await tx.programacaoFerias.update({
      where: { id },
      data: {
        status: statusNovo,
        integracaoStatus: resultado.sucesso ? "ENVIADA" : "ERRO",
        integracaoPayload: resultado.payload,
        integracaoRetorno: resultado.retorno ?? Prisma.JsonNull,
        integracaoErro: resultado.erro,
        integracaoProtocolo: resultado.protocolo,
      },
    });
    await registrarEvento({
      tx,
      programacaoId: id,
      usuarioId: permissao.usuarioId,
      statusAnterior: "ENVIANDO_SARH",
      statusNovo,
      descricao: resultado.sucesso
        ? "Programação enviada ao SARH."
        : "Falha controlada no envio da programação ao SARH.",
      metadados: {
        protocolo: resultado.protocolo,
        erro: resultado.erro,
      },
    });
  });

  revalidarFerias();
  const mensagem = resultado.sucesso
    ? "Programação enviada ao SARH."
    : resultado.erro ?? "Falha no envio ao SARH.";
  redirect(
    `/administracao/ferias/integracao-sarh?${resultado.sucesso ? "ok" : "erro"}=${encodeURIComponent(
      mensagem,
    )}`,
  );
}

export async function confirmarProgramacaoFeriasSarhAction(formData: FormData) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "programacao-ferias:executar-sarh:seccional",
    "programacao-ferias:executar-sarh:global",
  ]);
  if (!permissao.usuarioId) redirect("/login");

  const id = texto(formData, "id");
  const programacao = await prisma.programacaoFerias.findUnique({
    where: { id },
    include: { servidor: true },
  });
  if (!programacao) {
    voltarComMensagem(
      "/administracao/ferias/integracao-sarh",
      "Programação de férias não localizada.",
      "erro",
    );
  }

  const afastamento = await prisma.afastamentoSarh.findFirst({
    where: {
      servidorId: programacao.servidorId,
      exercicio: programacao.exercicio,
      ativo: true,
      dataInicio: programacao.dataInicio,
      dataFim: programacao.dataFim,
    },
    select: { id: true },
  });

  if (!afastamento) {
    redirect(
      "/administracao/ferias/integracao-sarh?erro=Registro ainda não voltou do SARH. Execute a sincronização SARH e tente confirmar novamente.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.programacaoFerias.update({
      where: { id },
      data: {
        status: "CONFIRMADA_SARH",
        integracaoStatus: "CONFIRMADA",
        afastamentoSarhId: afastamento.id,
        confirmadoSarhEm: new Date(),
      },
    });
    await registrarEvento({
      tx,
      programacaoId: id,
      usuarioId: permissao.usuarioId,
      statusAnterior: programacao.status,
      statusNovo: "CONFIRMADA_SARH",
      descricao: "Programação confirmada por registro sincronizado do SARH.",
      metadados: { afastamentoSarhId: afastamento.id },
    });
  });

  revalidarFerias();
  redirect("/administracao/ferias/integracao-sarh?ok=Programação confirmada no SARH.");
}
