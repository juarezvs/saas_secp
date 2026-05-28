import { listarMarcacoesBrutasPorServidorPendente } from "../../infrastructure/repositories/marcacao-bruta.repository";
import { processarMarcacaoBrutaService } from "./processar-marcacao-bruta.service";

export async function vincularMarcacoesBrutasServidorService(params: {
  servidorId: string;
  cpf?: string | null;
  matricula?: string | null;
  usuarioIdAuditoria?: string | null;
}) {
  const pendentes = await listarMarcacoesBrutasPorServidorPendente({
    cpf: params.cpf,
    matricula: params.matricula,
  });

  let processadas = 0;
  let aindaPendentes = 0;
  let erros = 0;

  for (const bruta of pendentes) {
    try {
      const resultado = await processarMarcacaoBrutaService({
        marcacaoBrutaId: bruta.id,
        usuarioIdAuditoria: params.usuarioIdAuditoria ?? undefined,
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
    servidorId: params.servidorId,
    total: pendentes.length,
    processadas,
    aindaPendentes,
    erros,
  };
}
