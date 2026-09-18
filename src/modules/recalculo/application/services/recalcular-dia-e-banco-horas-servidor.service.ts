import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import {
  recalcularDiaServidorService,
  type RecalcularDiaServidorParams,
} from "./recalcular-dia-servidor.service";
import { regerarBancoHorasMesService } from "./regerar-banco-horas-mes.service";
import { registrarCompetenciaEspelhoAtualizada } from "./processamento-espelho-ponto.service";

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
  await registrarCompetenciaEspelhoAtualizada({
    servidorId: params.servidorId,
    ...competencia,
    motivo: params.origem ?? "RECALCULO_DIA_E_BANCO_HORAS",
    solicitadoPorId: params.usuarioIdAuditoria,
  });

  return {
    ...apuracaoDia,
    bancoHoras,
    competencia,
  };
}
