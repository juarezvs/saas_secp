import { DimepSmartPrintClient } from "./dimep-smart-print.client";
import { HenryProtocoloLinhaAdvClient } from "./henry-protocolo-linha-adv.client";
import { HenryLumenBalcaoClient } from "./henry-lumen-balcao.client";
import type {
  DadosConexaoRelogioPonto,
  RelogioPontoProvider,
} from "@/modules/integracoes/domain/relogio-ponto.types";

function usarHenryLumenBalcao(conexao: DadosConexaoRelogioPonto) {
  const configuracao =
    conexao.configuracao && typeof conexao.configuracao === "object"
      ? (conexao.configuracao as Record<string, unknown>)
      : {};
  const protocolo =
    typeof configuracao.protocolo === "string"
      ? configuracao.protocolo.toUpperCase()
      : "";
  const modelo = conexao.modelo?.toUpperCase() ?? "";
  const codigo = conexao.codigo.toUpperCase();

  return (
    protocolo === "HENRY_LUMEN_BALCAO" ||
    protocolo === "HENRY_LUMEN_BALCAO_LT" ||
    codigo === "HENRY_SUBSOLO_SJRR" ||
    (modelo.includes("LUMEN") && modelo.includes("BALCAO"))
  );
}

export function criarRelogioPontoProvider(
  conexao: DadosConexaoRelogioPonto,
): RelogioPontoProvider {
  if (conexao.fabricante === "DIMEP") {
    return new DimepSmartPrintClient(conexao);
  }

  if (conexao.fabricante === "HENRY") {
    if (usarHenryLumenBalcao(conexao)) {
      return new HenryLumenBalcaoClient(conexao);
    }

    return new HenryProtocoloLinhaAdvClient(conexao);
  }

  throw new Error(`Fabricante de relogio nao suportado: ${conexao.fabricante}.`);
}
