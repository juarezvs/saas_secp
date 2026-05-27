import { prisma } from "@/shared/infrastructure/database/prisma";
import { consolidarBoletimServidor } from "./consolidar-boletim-servidor.service";
import { buscarFechamentoParaBoletim } from "../../infrastructure/repositories/boletim-frequencia.repository";

export async function gerarBoletimUnidadeService(params: {
  fechamentoId: string;
  usuarioId: string;
  observacao?: string;
}) {
  const fechamento = await buscarFechamentoParaBoletim(params.fechamentoId);

  if (!fechamento) {
    throw new Error("Fechamento mensal não encontrado.");
  }

  if (fechamento.status !== "HOMOLOGADO") {
    throw new Error(
      "O Boletim de Frequência somente pode ser gerado após a homologação integral do fechamento.",
    );
  }

  if (fechamento.boletimFrequencia) {
    return fechamento.boletimFrequencia;
  }

  const servidoresHomologados = fechamento.servidores.filter((item) =>
    ["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(item.status),
  );

  if (servidoresHomologados.length !== fechamento.servidores.length) {
    throw new Error(
      "Existem servidores sem homologação concluída no fechamento mensal.",
    );
  }

  const itens = servidoresHomologados.map(consolidarBoletimServidor);

  const totais = itens.reduce(
    (acc, item) => {
      acc.totalServidores += 1;
      acc.totalHomologados += 1;
      acc.totalComRessalva += item.tipoResumo === "COM_RESSALVA" ? 1 : 0;
      acc.totalFaltas += item.faltas;
      acc.totalCargaPrevistaMinutos += item.cargaPrevistaMinutos;
      acc.totalTrabalhadoMinutos += item.minutosTrabalhados;
      acc.totalCreditoMinutos += item.minutosCredito;
      acc.totalDebitoMinutos += item.minutosDebito;
      return acc;
    },
    {
      totalServidores: 0,
      totalHomologados: 0,
      totalComRessalva: 0,
      totalFaltas: 0,
      totalCargaPrevistaMinutos: 0,
      totalTrabalhadoMinutos: 0,
      totalCreditoMinutos: 0,
      totalDebitoMinutos: 0,
    },
  );

  const boletim = await prisma.$transaction(async (tx) => {
    const novoBoletim = await tx.boletimFrequencia.create({
      data: {
        fechamentoId: fechamento.id,
        unidadeId: fechamento.unidadeId,
        anoReferencia: fechamento.anoReferencia,
        mesReferencia: fechamento.mesReferencia,
        status: "GERADO",
        observacao: params.observacao || null,
        geradoPorUsuarioId: params.usuarioId,
        ...totais,
        metadados: {
          unidade: {
            id: fechamento.unidade.id,
            sigla: fechamento.unidade.sigla,
            nome: fechamento.unidade.nome,
          },
          gestorResponsavel: fechamento.gestorResponsavel
            ? {
                servidorId: fechamento.gestorResponsavel.servidorId,
                nome: fechamento.gestorResponsavel.servidor.usuario.nome,
              }
            : null,
          geradoEm: new Date(),
        },
      },
    });

    await tx.boletimFrequenciaServidor.createMany({
      data: itens.map((item) => ({
        boletimId: novoBoletim.id,
        servidorId: item.servidorId,
        homologacaoServidorMesId: item.homologacaoServidorMesId,
        tipoResumo: item.tipoResumo,
        cargaPrevistaMinutos: item.cargaPrevistaMinutos,
        minutosTrabalhados: item.minutosTrabalhados,
        minutosCredito: item.minutosCredito,
        minutosDebito: item.minutosDebito,
        faltas: item.faltas,
        saldoBancoAntesMinutos: item.saldoBancoAntesMinutos,
        saldoBancoDepoisMinutos: item.saldoBancoDepoisMinutos,
        observacaoChefia: item.observacaoChefia,
        ressalvas: item.ressalvas,
        ocorrencias: item.ocorrencias,
      })),
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: params.usuarioId,
        entidade: "BoletimFrequencia",
        entidadeId: novoBoletim.id,
        acao: "BOLETIM_FREQUENCIA_GERADO",
        dadosDepois: {
          boletimId: novoBoletim.id,
          fechamentoId: fechamento.id,
          unidadeId: fechamento.unidadeId,
          anoReferencia: fechamento.anoReferencia,
          mesReferencia: fechamento.mesReferencia,
          ...totais,
        },
      },
    });

    return novoBoletim;
  });

  return boletim;
}
