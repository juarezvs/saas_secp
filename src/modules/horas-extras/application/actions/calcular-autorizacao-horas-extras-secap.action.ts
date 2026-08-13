"use server";

import { revalidatePath } from "next/cache";

import {
  obterPermissoesDaSessao,
  possuiPermissaoNaLista,
} from "@/modules/auth/application/services/permissao.service";
import { ContrachequeSarhRemuneracaoProvider } from "@/modules/horas-extras/infrastructure/integrations/contracheque-remuneracao.provider";

import { calcularAutorizacaoHorasExtras } from "../services/calcular-autorizacao-horas-extras.service";

export type CalcularAutorizacaoHorasExtrasSecapFormState = {
  sucesso: boolean;
  mensagem: string;
};

function podeCalcular(permissoes: string[]) {
  return (
    possuiPermissaoNaLista(permissoes, "horas-extras:gerar-lote:global") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:gerar-lote:seccional") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:visualizar-folha:global") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:visualizar-folha:seccional")
  );
}

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function formatarCentavos(centavos: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

export async function calcularAutorizacaoHorasExtrasSecapAction(
  _estadoAnterior: CalcularAutorizacaoHorasExtrasSecapFormState,
  formData: FormData,
): Promise<CalcularAutorizacaoHorasExtrasSecapFormState> {
  const permissao = await obterPermissoesDaSessao();

  if (!permissao.permitido) {
    return {
      sucesso: false,
      mensagem: "Sessao expirada. Entre novamente para continuar.",
    };
  }

  if (!podeCalcular(permissao.permissoes)) {
    return {
      sucesso: false,
      mensagem: "Voce nao possui permissao para calcular horas extras.",
    };
  }

  const autorizacaoId = String(formData.get("autorizacaoId") ?? "");

  if (!autorizacaoId) {
    return {
      sucesso: false,
      mensagem: "Autorizacao nao informada.",
    };
  }

  try {
    const calculo = await calcularAutorizacaoHorasExtras({
      autorizacaoId,
      usuarioId: permissao.usuarioId,
      perfilAtivoCodigo: permissao.perfilAtivoCodigo,
      remuneracaoProvider: new ContrachequeSarhRemuneracaoProvider(),
    });

    revalidatePath("/secap/horas-extras/autorizacoes");
    revalidatePath("/folha/horas-extras");

    return {
      sucesso: true,
      mensagem: `Calculado: ${formatarMinutos(calculo.totalMinutos)} em ${formatarCentavos(calculo.totalValorCentavos)}.`,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel calcular as horas extras.",
    };
  }
}
