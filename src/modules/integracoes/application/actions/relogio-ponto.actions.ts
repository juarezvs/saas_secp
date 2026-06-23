"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { usuarioPossuiPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import {
  capturarTodasMarcacoesRelogioPontoService,
  coletarMarcacoesRelogioPontoService,
  configurarEventosOnlineRelogioPontoService,
  consultarSaudeRelogioPontoService,
  enviarBiometriaRelogioPontoService,
  reprocessarMarcacoesRelogioPontoService,
} from "../services/relogios-ponto/relogio-ponto-operacoes.service";

export type RelogioPontoActionState = {
  sucesso: boolean;
  mensagem: string | null;
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
      | "HENRY_RAW";

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
