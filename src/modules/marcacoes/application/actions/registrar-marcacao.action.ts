"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { resolverJornadaVigenteDoServidor } from "@/modules/jornadas/application/services/resolver-jornada.service";
import {
  registrarMarcacaoSchema,
  type RegistrarMarcacaoFormState,
} from "../schemas/marcacao.schema";
import {
  formatarDataHoraPtBr,
  obterDataReferencia,
} from "../services/data-marcacao.service";
import { classificarProximaMarcacao } from "../services/classificar-marcacao.service";
import {
  buscarServidorPorUsuarioId,
  listarMarcacoesDoServidorNoDia,
} from "../../infrastructure/repositories/marcacao.repository";

function extrairDados(formData: FormData) {
  return {
    observacao: String(formData.get("observacao") ?? "").trim(),
    latitude: String(formData.get("latitude") ?? "").trim(),
    longitude: String(formData.get("longitude") ?? "").trim(),
  };
}

function decimalOuNull(valor?: string) {
  if (!valor) {
    return null;
  }

  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return null;
  }

  return numero;
}

export async function registrarMarcacaoAction(
  _estadoAnterior: RegistrarMarcacaoFormState,
  formData: FormData,
): Promise<RegistrarMarcacaoFormState> {
  const session = await auth();

  if (!session?.user) {
    return {
      sucesso: false,
      mensagem: "Sessão expirada. Faça login novamente.",
    };
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("marcacoes:registrar:proprio")) {
    return {
      sucesso: false,
      mensagem: "Você não possui permissão para registrar ponto.",
    };
  }

  const dados = extrairDados(formData);
  const parsed = registrarMarcacaoSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os dados da marcação.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const servidor = await buscarServidorPorUsuarioId(session.user.id);

  if (!servidor) {
    return {
      sucesso: false,
      mensagem:
        "Nenhum cadastro de servidor ativo foi encontrado para o usuário autenticado.",
    };
  }

  const agora = new Date();
  const jornadaVigente = await resolverJornadaVigenteDoServidor(
    servidor.id,
    agora,
  );

  if (!jornadaVigente) {
    return {
      sucesso: false,
      mensagem:
        "Não há jornada vigente cadastrada para este servidor. Procure o NUTEC ou a área responsável.",
    };
  }

  const marcacoesDoDia = await listarMarcacoesDoServidorNoDia({
    servidorId: servidor.id,
    dataHora: agora,
  });

  let classificacao;

  try {
    classificacao = classificarProximaMarcacao({
      marcacoesDoDia,
      exigeIntervalo: jornadaVigente.exigeIntervalo,
    });
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Não foi possível classificar a próxima marcação.",
    };
  }

  /*
   * Regra preparada para biometria:
   * - Primeira marcação do dia exige reconhecimento facial.
   * - Nesta etapa ainda registraremos WEB, mas metadados sinalizam a exigência.
   * - Na etapa de biometria, bloquearemos o registro se não houver token/validação facial.
   */
  const exigeReconhecimentoFacial =
    classificacao.exigeReconhecimentoFacial && marcacoesDoDia.length === 0;

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for") ??
    requestHeaders.get("x-real-ip") ??
    null;
  const userAgent = requestHeaders.get("user-agent");

  const dataReferencia = obterDataReferencia(agora);

  const marcacao = await prisma.$transaction(async (tx) => {
    const novaMarcacao = await tx.marcacao.create({
      data: {
        servidorId: servidor.id,
        jornadaServidorId: jornadaVigente.jornadaServidorId,
        dataHora: agora,
        dataReferencia,
        tipo: classificacao.tipo,
        fonte: "WEB",
        status: "VALIDA",
        latitude: decimalOuNull(parsed.data.latitude),
        longitude: decimalOuNull(parsed.data.longitude),
        ip,
        userAgent,
        observacao: parsed.data.observacao || null,
        criadaPorUsuarioId: session.user.id,
        metadados: {
          ordem: classificacao.ordem,
          descricao: classificacao.descricao,
          exigeReconhecimentoFacial,
          biometriaValidadaNestaEtapa: false,
          jornada: {
            id: jornadaVigente.jornadaId,
            codigo: jornadaVigente.codigo,
            cargaDiariaMinutos: jornadaVigente.cargaDiariaMinutos,
          },
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "Marcacao",
        entidadeId: novaMarcacao.id,
        acao: "MARCACAO_REGISTRADA",
        dadosDepois: {
          id: novaMarcacao.id,
          servidorId: novaMarcacao.servidorId,
          dataHora: novaMarcacao.dataHora,
          dataReferencia: novaMarcacao.dataReferencia,
          tipo: novaMarcacao.tipo,
          fonte: novaMarcacao.fonte,
          status: novaMarcacao.status,
        },
        metadados: {
          classificacao,
          exigeReconhecimentoFacial,
        },
        ip,
        userAgent,
      },
    });

    return novaMarcacao;
  });

  revalidatePath("/marcacoes");
  revalidatePath("/marcacoes/registrar");

  return {
    sucesso: true,
    mensagem: `${classificacao.descricao} registrada com sucesso.`,
    tipoMarcacao: classificacao.tipo,
    dataHora: formatarDataHoraPtBr(marcacao.dataHora),
  };
}
