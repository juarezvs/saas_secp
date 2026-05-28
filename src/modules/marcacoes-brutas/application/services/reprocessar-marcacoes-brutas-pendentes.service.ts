import { listarMarcacoesBrutasPendentes } from "../../infrastructure/repositories/marcacao-bruta.repository";
import { processarMarcacaoBrutaService } from "./processar-marcacao-bruta.service";

export async function reprocessarMarcacoesBrutasPendentesService(params: {
  usuarioId?: string | null;
  limite?: number;
}) {
  const pendentes = await listarMarcacoesBrutasPendentes({
    limite: params.limite ?? 500,
  });

  let processadas = 0;
  let aindaPendentes = 0;
  let erros = 0;

  for (const bruta of pendentes) {
    try {
      const resultado = await processarMarcacaoBrutaService({
        marcacaoBrutaId: bruta.id,
        usuarioIdAuditoria: params.usuarioId ?? undefined,
      });

      if (resultado.sucesso) {
        processadas++;
      } else {
        aindaPendentes++;
      }
    } catch {
      erros++;
    }
  }

  return {
    total: pendentes.length,
    processadas,
    aindaPendentes,
    erros,
  };
}