import { HenryProtocoloLinhaAdvClient } from "./henry-protocolo-linha-adv.client";
import type {
  DadosConexaoRelogioPonto,
  RelogioPontoProvider,
} from "@/modules/integracoes/domain/relogio-ponto.types";

export function criarRelogioPontoProvider(
  conexao: DadosConexaoRelogioPonto,
): RelogioPontoProvider {
  if (conexao.fabricante === "HENRY") {
    return new HenryProtocoloLinhaAdvClient(conexao);
  }

  throw new Error(`Fabricante de relogio nao suportado: ${conexao.fabricante}.`);
}
