import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import {
  recalcularDiaServidorService,
  type RecalcularDiaServidorParams,
} from "./recalcular-dia-servidor.service";
import { regerarBancoHorasMesService } from "./regerar-banco-horas-mes.service";

export type RecalcularDiaEBancoHorasServidorParams =
  RecalcularDiaServidorParams;

function competenciaDaDataReferencia(dataReferencia: Date) {
  const data = normalizarDataReferencia(dataReferencia);

  return {
    anoReferencia: data.getUTCFullYear(),
    mesReferencia: data.getUTCMonth() + 1,
  };
}

export async function recalcularDiaEBancoHorasServidorService(
  params: RecalcularDiaEBancoHorasServidorParams,
) {
  const apuracaoDia = await recalcularDiaServidorService(params);
  const competencia = competenciaDaDataReferencia(params.dataReferencia);
  const bancoHoras = await regerarBancoHorasMesService({
    servidorId: params.servidorId,
    ...competencia,
    usuarioIdAuditoria: params.usuarioIdAuditoria,
    origem: params.origem,
  });

  return {
    ...apuracaoDia,
    bancoHoras,
    competencia,
  };
}
