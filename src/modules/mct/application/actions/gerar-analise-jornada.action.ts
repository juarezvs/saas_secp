"use server";

import { auth } from "@/auth";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { perfilAtivoEhChefia } from "@/modules/auth/application/services/perfil-chefia.service";
import {
  buscarServidorComUsuarioPorUsuarioId,
  listarServidoresParaEspelhoPonto,
} from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import type { AnaliseJornadaMctDto } from "../dtos/analise-jornada.dto";
import { gerarAnaliseJornadaShadow } from "../services/gerar-analise-jornada-shadow.service";
import { listarAnalisesJornadaMctNoMes } from "../../infrastructure/repositories/mct-analise-jornada.repository";

export type GerarAnaliseJornadaResultado = {
  sucesso: boolean;
  mensagem: string;
  analise?: AnaliseJornadaMctDto;
};

async function podeConsultarServidor(params: {
  usuarioId: string;
  perfilCodigo?: string | null;
  permissoes: string[];
  servidorId: string;
}) {
  const proprio = await buscarServidorComUsuarioPorUsuarioId(params.usuarioId);
  const podeConsultarProprio =
    params.permissoes.includes("espelho-ponto:visualizar:proprio") ||
    params.permissoes.includes("apuracao:consultar:proprio");
  if (podeConsultarProprio && proprio?.id === params.servidorId) return true;

  const chefia = perfilAtivoEhChefia({
    perfilAtivoCodigo: params.perfilCodigo,
    permissoes: params.permissoes,
  });
  if (chefia) {
    const subordinados = await listarServidoresParaEspelhoPonto({
      usuarioId: params.usuarioId,
      escopo: "chefia",
      servidorId: params.servidorId,
      limite: 1,
    });
    if (subordinados.some((item) => item.id === params.servidorId)) return true;
  }

  const consultaAmpla =
    params.permissoes.includes("apuracao:consultar:global") ||
    params.permissoes.includes("apuracao:consultar:seccional");
  if (!consultaAmpla) return false;

  const escopo = await obterEscopoOrgaoDaSessao();
  if (escopo.global) return true;
  const servidor = await prisma.servidor.findUnique({
    where: { id: params.servidorId },
    select: { orgaoId: true },
  });
  return Boolean(
    servidor?.orgaoId && escopo.orgaoIds.includes(servidor.orgaoId),
  );
}

export async function gerarAnaliseJornadaAction(params: {
  servidorId: string;
  dataReferencia: string;
}): Promise<GerarAnaliseJornadaResultado> {
  const session = await auth();
  if (!session?.user)
    return { sucesso: false, mensagem: "Sua sessão expirou." };
  if (!params.dataReferencia.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return { sucesso: false, mensagem: "Data de referência inválida." };
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];
  const permitido = await podeConsultarServidor({
    usuarioId: session.user.id,
    perfilCodigo: session.user.perfilAtivo?.codigo,
    permissoes,
    servidorId: params.servidorId,
  });
  if (!permitido)
    return {
      sucesso: false,
      mensagem: "Você não pode analisar este servidor.",
    };

  try {
    const dataReferencia = new Date(`${params.dataReferencia}T00:00:00.000Z`);
    await gerarAnaliseJornadaShadow({
      servidorId: params.servidorId,
      dataReferencia,
    });
    const servidor = await prisma.servidor.findUnique({
      where: { id: params.servidorId },
      select: { orgaoId: true },
    });
    if (!servidor?.orgaoId)
      throw new Error("Servidor ou órgão não encontrado.");
    const analises = await listarAnalisesJornadaMctNoMes({
      orgaoId: servidor.orgaoId,
      servidorId: params.servidorId,
      ano: dataReferencia.getUTCFullYear(),
      mes: dataReferencia.getUTCMonth() + 1,
    });
    const analise = analises[params.dataReferencia];
    if (!analise)
      throw new Error("A análise foi processada, mas não pôde ser carregada.");
    return {
      sucesso: true,
      mensagem: "Análise da jornada gerada com sucesso.",
      analise,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a análise da jornada.",
    };
  }
}
