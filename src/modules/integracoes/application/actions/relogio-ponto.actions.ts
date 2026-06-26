"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { usuarioPossuiPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  capturarTodasMarcacoesRelogioPontoService,
  coletarMarcacoesRelogioPontoService,
  configurarEventosOnlineRelogioPontoService,
  consultarSaudeRelogioPontoService,
  enviarBiometriaRelogioPontoService,
  listarCadastrosBiometricosEquipamentoService,
  reprocessarMarcacoesRelogioPontoService,
  sincronizarBiometriasEquipamentosOrgaoService,
} from "../services/relogios-ponto/relogio-ponto-operacoes.service";

export type RelogioPontoActionState = {
  sucesso: boolean;
  mensagem: string | null;
  cadastros?: Array<{
    codigo?: string | null;
    cpf?: string | null;
    nome?: string | null;
    matricula: string;
    cartoes?: string[];
    templates?: number;
  }>;
  sincronizacao?: {
    lidos: number;
    comTemplate: number;
    ignoradosSemTemplate: number;
    destinos: Array<{
      codigo: string;
      nome: string;
      sucesso: boolean;
      mensagem: string;
      enviados: number;
      rejeitados: number;
    }>;
  };
};

async function podeGerenciarIntegracoes() {
  const session = await auth();

  if (!session?.user) {
    return {
      autorizado: false,
      mensagem: "Sessao expirada. Faca login novamente.",
      usuarioId: null,
    };
  }

  const autorizado = usuarioPossuiPermissaoNoPerfil(
    session.user.perfilAtivo?.codigo,
    session.user.perfilAtivo?.permissoes,
    "integracoes:gerenciar:global",
  );

  return {
    autorizado,
    mensagem: autorizado
      ? null
      : "Voce nao possui permissao para gerenciar equipamentos.",
    usuarioId: session.user.id,
  };
}

function variantesMatricula(valor: string) {
  const limpo = valor.trim();
  const semZeros = limpo.replace(/^0+(?=\d)/, "");
  return Array.from(new Set([limpo, semZeros].filter(Boolean)));
}

async function enriquecerCadastrosComServidores(
  cadastros: NonNullable<RelogioPontoActionState["cadastros"]>,
) {
  const matriculas = Array.from(
    new Set(cadastros.flatMap((cadastro) => variantesMatricula(cadastro.matricula))),
  );

  if (matriculas.length === 0) {
    return cadastros;
  }

  const servidores = await prisma.servidor.findMany({
    where: {
      matricula: {
        in: matriculas,
      },
    },
    select: {
      matricula: true,
      cpf: true,
      nomeFuncional: true,
      nomeCompletoSarh: true,
      usuario: {
        select: {
          nome: true,
        },
      },
    },
  });
  const servidoresPorMatricula = new Map(
    servidores.map((servidor) => [servidor.matricula, servidor]),
  );

  return cadastros.map((cadastro) => {
    const servidor = variantesMatricula(cadastro.matricula)
      .map((matricula) => servidoresPorMatricula.get(matricula))
      .find(Boolean);

    if (!servidor) {
      return cadastro;
    }

    return {
      ...cadastro,
      cpf: cadastro.cpf ?? servidor.cpf ?? null,
      nome:
        cadastro.nome ??
        servidor.nomeFuncional ??
        servidor.nomeCompletoSarh ??
        servidor.usuario.nome,
      matricula: servidor.matricula || cadastro.matricula,
    };
  });
}

export async function consultarSaudeRelogioPontoAction(
  _estado: RelogioPontoActionState,
  formData: FormData,
): Promise<RelogioPontoActionState> {
  const permissao = await podeGerenciarIntegracoes();
  if (!permissao.autorizado) {
    return { sucesso: false, mensagem: permissao.mensagem };
  }

  try {
    const equipamentoId = String(formData.get("equipamentoId") ?? "");
    const resultado = await consultarSaudeRelogioPontoService(equipamentoId);
    revalidatePath("/equipamentos");

    return {
      sucesso: resultado.status === "ONLINE",
      mensagem: resultado.mensagem,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel consultar o equipamento.",
    };
  }
}

export async function coletarMarcacoesRelogioPontoAction(
  _estado: RelogioPontoActionState,
  formData: FormData,
): Promise<RelogioPontoActionState> {
  const permissao = await podeGerenciarIntegracoes();
  if (!permissao.autorizado) {
    return { sucesso: false, mensagem: permissao.mensagem };
  }

  try {
    const equipamentoId = String(formData.get("equipamentoId") ?? "");
    const nsrInicial = String(formData.get("nsrInicial") ?? "").trim();
    const quantidade = Number(formData.get("quantidade") ?? 50);
    const resultado = await coletarMarcacoesRelogioPontoService({
      equipamentoId,
      nsrInicial: nsrInicial || null,
      quantidade,
      usuarioIdAuditoria: permissao.usuarioId,
    });

    revalidatePath("/equipamentos");
    revalidatePath("/marcacoes-brutas");

    return {
      sucesso: true,
      mensagem: `${resultado.marcacoes.length} evento(s) recebido(s); ${resultado.criadas} marcacao(oes) bruta(s) criada(s). Proximo NSR: ${resultado.proximoNsr ?? "-"}.`,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel coletar marcacoes do equipamento.",
    };
  }
}

export async function capturarTodasMarcacoesRelogioPontoAction(
  _estado: RelogioPontoActionState,
  formData: FormData,
): Promise<RelogioPontoActionState> {
  const permissao = await podeGerenciarIntegracoes();
  if (!permissao.autorizado) {
    return { sucesso: false, mensagem: permissao.mensagem };
  }

  try {
    const confirmado = formData.get("confirmarCapturaCompleta") === "on";
    if (!confirmado) {
      return {
        sucesso: false,
        mensagem: "Confirme a captura completa antes de executar.",
      };
    }

    const equipamentoId = String(formData.get("equipamentoId") ?? "");
    const nsrInicial = String(formData.get("nsrInicialCompleto") ?? "").trim();
    const quantidadePorLote = Number(formData.get("quantidadePorLote") ?? 500);
    const limiteLotes = Number(formData.get("limiteLotes") ?? 100);
    const reprocessarAoFinal = formData.get("reprocessarAoFinal") === "on";
    const resultado = await capturarTodasMarcacoesRelogioPontoService({
      equipamentoId,
      nsrInicial: nsrInicial || 1,
      quantidadePorLote,
      limiteLotes,
      reprocessarAoFinal,
      usuarioIdAuditoria: permissao.usuarioId,
    });

    revalidatePath("/equipamentos");
    revalidatePath("/marcacoes-brutas");

    const resumoReprocessamento = resultado.reprocessamento
      ? ` Reprocessamento: ${resultado.reprocessamento.processadas} processada(s), ${resultado.reprocessamento.aindaPendentes} pendente(s).`
      : "";

    return {
      sucesso: true,
      mensagem: `${resultado.lotesExecutados} lote(s); ${resultado.recebidas} evento(s) recebido(s); ${resultado.criadas} nova(s). Proximo NSR: ${resultado.proximoNsr ?? "-"}.${resultado.limiteAtingido ? " Limite atingido; execute novamente para continuar." : ""}${resumoReprocessamento}`,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel capturar todas as marcacoes.",
    };
  }
}

export async function reprocessarMarcacoesRelogioPontoAction(
  _estado: RelogioPontoActionState,
  formData: FormData,
): Promise<RelogioPontoActionState> {
  const permissao = await podeGerenciarIntegracoes();
  if (!permissao.autorizado) {
    return { sucesso: false, mensagem: permissao.mensagem };
  }

  try {
    const equipamentoId = String(formData.get("equipamentoId") ?? "");
    const limite = Number(formData.get("limiteReprocessamento") ?? 5000);
    const resultado = await reprocessarMarcacoesRelogioPontoService({
      equipamentoId,
      limite,
      usuarioIdAuditoria: permissao.usuarioId,
    });

    revalidatePath("/equipamentos");
    revalidatePath("/marcacoes-brutas");

    return {
      sucesso: true,
      mensagem: `${resultado.analisadas} bruta(s) analisada(s); ${resultado.processadas} processada(s); ${resultado.aindaPendentes} pendente(s); ${resultado.erros} erro(s).`,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel reprocessar marcacoes do equipamento.",
    };
  }
}

export async function configurarEventosOnlineRelogioPontoAction(
  _estado: RelogioPontoActionState,
  formData: FormData,
): Promise<RelogioPontoActionState> {
  const permissao = await podeGerenciarIntegracoes();
  if (!permissao.autorizado) {
    return { sucesso: false, mensagem: permissao.mensagem };
  }

  try {
    const equipamentoId = String(formData.get("equipamentoId") ?? "");
    const habilitado = formData.get("habilitado") === "on";
    const ipServidor = String(formData.get("ipServidor") ?? "").trim() || null;
    const portaServidorTexto = String(formData.get("portaServidor") ?? "").trim();
    const portaServidor = portaServidorTexto ? Number(portaServidorTexto) : null;

    const resultado = await configurarEventosOnlineRelogioPontoService({
      equipamentoId,
      habilitado,
      ipServidor,
      portaServidor,
    });

    revalidatePath("/equipamentos");

    return {
      sucesso: resultado.sucesso,
      mensagem: resultado.mensagem,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel configurar eventos online.",
    };
  }
}

export async function enviarBiometriaRelogioPontoAction(
  _estado: RelogioPontoActionState,
  formData: FormData,
): Promise<RelogioPontoActionState> {
  const permissao = await podeGerenciarIntegracoes();
  if (!permissao.autorizado) {
    return { sucesso: false, mensagem: permissao.mensagem };
  }

  try {
    const equipamentoId = String(formData.get("equipamentoId") ?? "");
    const matricula = String(formData.get("matricula") ?? "").trim();
    const template = String(formData.get("template") ?? "").trim();
    const dedo = String(formData.get("dedo") ?? "").trim() || "1";
    const formato = String(formData.get("formato") ?? "SUPREMA") as
      | "SUPREMA"
      | "FS_SWIPE_SINATRA"
      | "HENRY_RAW"
      | "DIMEP_RAW"
      | "ISO_19794_2"
      | "ANSI_378";

    if (!matricula || !template) {
      return {
        sucesso: false,
        mensagem: "Informe matricula e template biometrico.",
      };
    }

    const resultado = await enviarBiometriaRelogioPontoService({
      equipamentoId,
      matricula,
      dedo,
      template,
      formato,
    });

    revalidatePath("/equipamentos");

    return {
      sucesso: resultado.sucesso,
      mensagem: resultado.mensagem,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar biometria ao equipamento.",
    };
  }
}

export async function listarCadastrosBiometricosEquipamentoAction(
  _estado: RelogioPontoActionState,
  formData: FormData,
): Promise<RelogioPontoActionState> {
  const permissao = await podeGerenciarIntegracoes();
  if (!permissao.autorizado) {
    return { sucesso: false, mensagem: permissao.mensagem };
  }

  try {
    const equipamentoId = String(formData.get("equipamentoId") ?? "");
    const quantidade = Number(formData.get("quantidadeCadastros") ?? 25);
    const indiceInicial =
      String(formData.get("indiceInicialCadastros") ?? "").trim() || 0;
    const incluirTemplates = formData.get("incluirTemplates") === "on";
    const resultado = await listarCadastrosBiometricosEquipamentoService({
      equipamentoId,
      quantidade,
      indiceInicial,
      incluirTemplates,
    });

    const cadastros = await enriquecerCadastrosComServidores(
      resultado.cadastros.map((cadastro) => ({
        codigo: cadastro.codigo ?? null,
        cpf: cadastro.cpf ?? null,
        nome: cadastro.nome ?? null,
        matricula: cadastro.matricula,
        cartoes: cadastro.cartoes ?? [],
        templates: cadastro.templates?.length ?? 0,
      })),
    );

    return {
      sucesso: true,
      mensagem: resultado.mensagem,
      cadastros,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel ler os cadastros do equipamento.",
    };
  }
}

export async function sincronizarBiometriasEquipamentosOrgaoAction(
  _estado: RelogioPontoActionState,
  formData: FormData,
): Promise<RelogioPontoActionState> {
  const permissao = await podeGerenciarIntegracoes();
  if (!permissao.autorizado) {
    return { sucesso: false, mensagem: permissao.mensagem };
  }

  try {
    const confirmado = formData.get("confirmarSincronizacaoBiometria") === "on";

    if (!confirmado) {
      return {
        sucesso: false,
        mensagem: "Confirme a sincronizacao antes de executar.",
      };
    }

    const equipamentoId = String(formData.get("equipamentoId") ?? "");
    const quantidade = Number(formData.get("quantidadeSincronizacao") ?? 100);
    const indiceInicial =
      String(formData.get("indiceInicialSincronizacao") ?? "").trim() || 0;
    const resultado = await sincronizarBiometriasEquipamentosOrgaoService({
      equipamentoOrigemId: equipamentoId,
      quantidade,
      indiceInicial,
    });

    revalidatePath("/equipamentos");

    return {
      sucesso: resultado.destinos.every((destino) => destino.sucesso),
      mensagem: `${resultado.comTemplate} cadastro(s) com biometria sincronizavel(is); ${resultado.destinos.length} equipamento(s) destino no orgao.`,
      sincronizacao: {
        lidos: resultado.lidos,
        comTemplate: resultado.comTemplate,
        ignoradosSemTemplate: resultado.ignoradosSemTemplate,
        destinos: resultado.destinos.map((destino) => ({
          codigo: destino.codigo,
          nome: destino.nome,
          sucesso: destino.sucesso,
          mensagem: destino.mensagem,
          enviados: destino.enviados,
          rejeitados: destino.rejeitados,
        })),
      },
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar biometrias entre equipamentos.",
    };
  }
}
