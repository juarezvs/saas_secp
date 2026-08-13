import { DimepSmartPrintClient } from "./dimep-smart-print.client";
import { ControlIdFaceIdClient } from "./control-id-face-id.client";
import { HenryProtocoloLinhaAdvClient } from "./henry-protocolo-linha-adv.client";
import { HenryLumenBalcaoClient } from "./henry-lumen-balcao.client";
import { HenryRepWebServerClient } from "./henry-rep-web-server.client";
import { IntelbrasBioTClient } from "./intelbras-bio-t.client";
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

function protocoloHenry(conexao: DadosConexaoRelogioPonto) {
  const configuracao =
    conexao.configuracao && typeof conexao.configuracao === "object"
      ? (conexao.configuracao as Record<string, unknown>)
      : {};

  return typeof configuracao.protocolo === "string"
    ? configuracao.protocolo.toUpperCase()
    : "";
}

function usarHenryRepWebServer(conexao: DadosConexaoRelogioPonto) {
  const protocolo = protocoloHenry(conexao);
  const modelo = conexao.modelo?.toUpperCase() ?? "";

  return (
    protocolo === "HENRY_REP_WEB_SERVER" ||
    modelo.includes("REP WEB SERVER")
  );
}

export function criarRelogioPontoProvider(
  conexao: DadosConexaoRelogioPonto,
): RelogioPontoProvider {
  if (conexao.fabricante === "DIMEP") {
    return new DimepSmartPrintClient(conexao);
  }

  if (conexao.fabricante === "CONTROL_ID") {
    return new ControlIdFaceIdClient(conexao);
  }

  if (conexao.fabricante === "INTELBRAS") {
    return new IntelbrasBioTClient(conexao);
  }

  if (conexao.fabricante === "HENRY") {
    if (usarHenryRepWebServer(conexao)) {
      return new HenryRepWebServerClient(conexao);
    }

    if (usarHenryLumenBalcao(conexao)) {
      return new HenryLumenBalcaoClient(conexao);
    }

    return new HenryProtocoloLinhaAdvClient(conexao);
  }

  throw new Error(`Fabricante de relogio nao suportado: ${conexao.fabricante}.`);
}
