import { prisma } from "@/shared/infrastructure/database/prisma";
import { resolverServidorMarcacaoBrutaService } from "./resolver-servidor-marcacao-bruta.service";

export async function associarMarcacoesBrutasPendentesService() {
  const identificadores = await prisma.marcacaoBruta.groupBy({
    by: ["cpf", "pis", "matricula", "equipamentoId"],
    where: {
      processada: false,
      servidorId: null,
      OR: [
        { cpf: { not: null } },
        { pis: { not: null } },
        { matricula: { not: null } },
      ],
    },
  });

  let associadas = 0;

  for (const identificador of identificadores) {
    const servidor = await resolverServidorMarcacaoBrutaService({
      cpf: identificador.cpf,
      pis: identificador.pis,
      matricula: identificador.matricula,
      equipamentoId: identificador.equipamentoId,
    });

    if (!servidor) {
      continue;
    }

    const resultado = await prisma.marcacaoBruta.updateMany({
      where: {
        processada: false,
        servidorId: null,
        cpf: identificador.cpf,
        pis: identificador.pis,
        matricula: identificador.matricula,
        equipamentoId: identificador.equipamentoId,
      },
      data: {
        servidorId: servidor.id,
        matricula: servidor.matricula,
        cpf: identificador.cpf ?? servidor.cpf,
        pis: identificador.pis ?? servidor.pis,
      },
    });

    associadas += resultado.count;
  }

  const semServidorCorrespondente = await prisma.marcacaoBruta.count({
    where: {
      processada: false,
      servidorId: null,
    },
  });

  return {
    associadas,
    semServidorCorrespondente,
  };
}
