import React, { type ReactElement } from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";
import { Worker, type Job } from "bullmq";

import { prisma } from "@/shared/infrastructure/database/prisma";
import { registrarAuditoriaEvento } from "@/modules/auditoria/application/services/registrar-auditoria.service";
import { prepararAutenticacaoEspelhoPonto } from "@/modules/documentos-autenticacao/application/services/documento-autenticacao.service";
import { listarFechamentosMensaisParaExportacao } from "@/modules/homologacao/infrastructure/repositories/homologacao.repository";
import { rotuloStatusFechamento } from "@/modules/homologacao/application/services/formatar-homologacao.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { listarLotacoesComChefiasRegistradas } from "../../infrastructure/repositories/relatorios-gerenciais.repository";
import {
  buscarDadosBancoHorasPdf,
  buscarDadosEspelhoPontoPdf,
} from "../../infrastructure/repositories/relatorios.repository";
import { BancoHorasPdfDocument } from "../../presentation/pdf/banco-horas-pdf.document";
import { BoletimFrequenciaPdfDocument } from "../../presentation/pdf/boletim-frequencia-pdf.document";
import { EspelhoPontoPdfDocument } from "../../presentation/pdf/espelho-ponto-pdf.document";
import { LotacoesChefiasPdfDocument } from "../../presentation/pdf/lotacoes-chefias-pdf.document";
import { gerarRelatorioGerencialPdf } from "../services/gerar-relatorio-gerencial-pdf-response.service";
import {
  RELATORIO_EXPORTACAO_QUEUE_NAME,
  relatorioExportacaoConnection,
  type RelatorioExportacaoJobData,
} from "../queues/relatorio-exportacao-queue";
import { salvarRelatorioExportado } from "../services/relatorio-exportacao-storage.service";

function filtro(data: RelatorioExportacaoJobData, chave: string) {
  return data.filtros[chave] ?? "";
}

function numeroFiltro(
  data: RelatorioExportacaoJobData,
  chave: string,
  padrao?: number,
) {
  const valor = filtro(data, chave);
  return valor ? Number(valor) : padrao;
}

function csv(linhas: Array<Array<string | number | null | undefined>>) {
  return `\uFEFF${linhas
    .map((linha) =>
      linha
        .map((valor) => `"${String(valor ?? "").replaceAll('"', '""')}"`)
        .join(";"),
    )
    .join("\n")}`;
}

async function gerarHomologacaoCsv(job: Job<RelatorioExportacaoJobData>) {
  const unidadeIdsPermitidos = await resolverUnidadeIdsPermitidosHomologacao(
    job.data,
  );
  const fechamentos = await listarFechamentosMensaisParaExportacao({
    busca: filtro(job.data, "busca"),
    anoReferencia: filtro(job.data, "anoReferencia"),
    mesReferencia: filtro(job.data, "mesReferencia"),
    unidade: filtro(job.data, "unidade"),
    unidadeIdsPermitidos,
    status: filtro(job.data, "status"),
  });

  const conteudo = csv([
    [
      "Referencia",
      "Unidade",
      "Servidores",
      "Status",
      "Aberto por",
      "Homologado por",
    ],
    ...fechamentos.map((fechamento) => [
      `${String(fechamento.mesReferencia).padStart(2, "0")}/${fechamento.anoReferencia}`,
      `${fechamento.unidade.sigla} - ${fechamento.unidade.nome}`,
      fechamento.totalServidores,
      rotuloStatusFechamento(fechamento.status),
      fechamento.abertoPor.nome,
      fechamento.homologadoPor?.nome ?? "",
    ]),
  ]);

  return salvarRelatorioExportado({
    jobId: String(job.id),
    nomeArquivo: "homologacao.csv",
    contentType: "text/csv; charset=utf-8",
    conteudo,
  });
}

function nomesHomologadoresServidores(
  servidores: Awaited<
    ReturnType<typeof listarFechamentosMensaisParaExportacao>
  >[number]["servidores"],
) {
  return Array.from(
    new Set(
      servidores
        .map((servidor) => servidor.homologadoPor?.nome)
        .filter((nome): nome is string => Boolean(nome)),
    ),
  ).join(", ");
}

function HomologacaoPdfDocument({
  fechamentos,
}: {
  fechamentos: Awaited<ReturnType<typeof listarFechamentosMensaisParaExportacao>>;
}) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: homologacaoPdfStyles.page },
      React.createElement(Text, { style: homologacaoPdfStyles.title }, "Homologacao"),
      React.createElement(
        Text,
        { style: homologacaoPdfStyles.subtitle },
        `Total de registros: ${fechamentos.length}`,
      ),
      React.createElement(
        View,
        { style: homologacaoPdfStyles.table },
        React.createElement(
          View,
          { style: [homologacaoPdfStyles.row, homologacaoPdfStyles.header] },
          React.createElement(Text, { style: homologacaoPdfStyles.cellReferencia }, "Ref."),
          React.createElement(Text, { style: homologacaoPdfStyles.cellUnidade }, "Unidade"),
          React.createElement(Text, { style: homologacaoPdfStyles.cellServidores }, "Serv."),
          React.createElement(Text, { style: homologacaoPdfStyles.cellStatus }, "Status"),
          React.createElement(Text, { style: homologacaoPdfStyles.cellUsuario }, "Aberto por"),
          React.createElement(
            Text,
            { style: homologacaoPdfStyles.cellUsuario },
            "Homologado por",
          ),
        ),
        ...fechamentos.map((fechamento) =>
          React.createElement(
            View,
            { key: fechamento.id, style: homologacaoPdfStyles.row },
            React.createElement(
              Text,
              { style: homologacaoPdfStyles.cellReferencia },
              `${String(fechamento.mesReferencia).padStart(2, "0")}/${fechamento.anoReferencia}`,
            ),
            React.createElement(
              Text,
              { style: homologacaoPdfStyles.cellUnidade },
              fechamento.unidade.sigla,
            ),
            React.createElement(
              Text,
              { style: homologacaoPdfStyles.cellServidores },
              String(fechamento.totalServidores),
            ),
            React.createElement(
              Text,
              { style: homologacaoPdfStyles.cellStatus },
              rotuloStatusFechamento(fechamento.status),
            ),
            React.createElement(
              Text,
              { style: homologacaoPdfStyles.cellUsuario },
              fechamento.abertoPor.nome,
            ),
            React.createElement(
              Text,
              { style: homologacaoPdfStyles.cellUsuario },
              fechamento.homologadoPor?.nome ||
                nomesHomologadoresServidores(fechamento.servidores) ||
                "-",
            ),
          ),
        ),
      ),
    ),
  );
}

const homologacaoPdfStyles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: "Helvetica", color: "#111827" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#4b5563", marginBottom: 14 },
  table: { borderWidth: 1, borderColor: "#d1d5db" },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    minHeight: 22,
  },
  header: { backgroundColor: "#f3f4f6", fontWeight: 700 },
  cellReferencia: { width: "10%", padding: 5 },
  cellUnidade: { width: "18%", padding: 5 },
  cellServidores: { width: "8%", padding: 5 },
  cellStatus: { width: "18%", padding: 5 },
  cellUsuario: { width: "23%", padding: 5 },
});

async function gerarHomologacaoPdf(job: Job<RelatorioExportacaoJobData>) {
  const unidadeIdsPermitidos = await resolverUnidadeIdsPermitidosHomologacao(
    job.data,
  );
  const fechamentos = await listarFechamentosMensaisParaExportacao({
    busca: filtro(job.data, "busca"),
    anoReferencia: filtro(job.data, "anoReferencia"),
    mesReferencia: filtro(job.data, "mesReferencia"),
    unidade: filtro(job.data, "unidade"),
    unidadeIdsPermitidos,
    status: filtro(job.data, "status"),
  });
  const documento = React.createElement(HomologacaoPdfDocument, {
    fechamentos,
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(documento);

  return salvarRelatorioExportado({
    jobId: String(job.id),
    nomeArquivo: "homologacao.pdf",
    contentType: "application/pdf",
    conteudo: buffer,
  });
}

async function resolverUnidadeIdsPermitidosHomologacao(
  data: RelatorioExportacaoJobData,
) {
  if (data.permissoes.includes("homologacao:consultar:global")) {
    return undefined;
  }

  return listarIdsUnidadesSubordinadasPorUsuario(data.usuarioId);
}

async function gerarLotacoesChefiasPdf(job: Job<RelatorioExportacaoJobData>) {
  const linhas = await listarLotacoesComChefiasRegistradas({
    usuarioId: job.data.usuarioId,
    permissoes: job.data.permissoes,
  });
  const documento = React.createElement(LotacoesChefiasPdfDocument, {
    linhas,
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(documento);

  return salvarRelatorioExportado({
    jobId: String(job.id),
    nomeArquivo: "lotacoes-chefias.pdf",
    contentType: "application/pdf",
    conteudo: buffer,
  });
}

async function gerarGerencialPdf(job: Job<RelatorioExportacaoJobData>) {
  if (!job.data.relatorioGerencialTipo) {
    throw new Error("Tipo gerencial nao informado.");
  }

  const hoje = new Date();
  const ano = Number(filtro(job.data, "ano") || hoje.getFullYear());
  const mes = Number(filtro(job.data, "mes") || hoje.getMonth() + 1);
  const servidorId = filtro(job.data, "servidorId") || null;
  const relatorio = await gerarRelatorioGerencialPdf({
    tipo: job.data.relatorioGerencialTipo,
    usuarioId: job.data.usuarioId,
    permissoes: job.data.permissoes,
    ano,
    mes,
    servidorId,
  });

  return salvarRelatorioExportado({
    jobId: String(job.id),
    nomeArquivo: relatorio.nomeArquivo,
    contentType: relatorio.contentType,
    conteudo: relatorio.buffer,
  });
}

async function gerarEspelhoPontoPdf(job: Job<RelatorioExportacaoJobData>) {
  const hoje = new Date();
  const servidorId = filtro(job.data, "servidorId");
  const ano = numeroFiltro(job.data, "ano", hoje.getFullYear());
  const mes = numeroFiltro(job.data, "mes", hoje.getMonth() + 1);

  if (!servidorId || !ano || !mes) {
    throw new Error("Parametros insuficientes para gerar espelho de ponto.");
  }

  const dados = await buscarDadosEspelhoPontoPdf({ servidorId, ano, mes });

  if (!dados.servidor) {
    throw new Error("Servidor nao encontrado.");
  }

  const podeExportar = await podeGerarEspelhoPontoParaServidor({
    usuarioId: job.data.usuarioId,
    permissoes: job.data.permissoes,
    servidor: dados.servidor,
  });

  if (!podeExportar) {
    throw new Error("Acesso negado ao servidor informado.");
  }

  const autenticacao = await prepararAutenticacaoEspelhoPonto({
    dados,
    requestUrl: filtro(job.data, "requestUrl") || "about:blank",
    criadoPorUsuarioId: job.data.usuarioId,
  });

  const documento = React.createElement(EspelhoPontoPdfDocument, {
    dados,
    autenticacao,
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(documento);
  const nomeArquivo = `espelho-ponto-${dados.servidor.matricula}-${String(
    mes,
  ).padStart(2, "0")}-${ano}.pdf`;

  await registrarAuditoriaEvento({
    usuarioId: job.data.usuarioId,
    entidade: "RelatorioExportacao",
    entidadeId: servidorId,
    acao: "EXPORTAR_RELATORIO_PDF",
    metadados: {
      relatorioId: "espelho-mensal",
      nomeRelatorio: "Espelho mensal de ponto",
      formato: "PDF",
      filtros: {
        ano,
        mes,
        competencia: `${ano}-${String(mes).padStart(2, "0")}`,
        servidorId,
        matricula: dados.servidor.matricula,
      },
      nomeArquivo,
    },
  });

  return salvarRelatorioExportado({
    jobId: String(job.id),
    nomeArquivo,
    contentType: "application/pdf",
    conteudo: buffer,
  });
}

async function podeGerarEspelhoPontoParaServidor(params: {
  usuarioId: string;
  permissoes: string[];
  servidor: {
    usuarioId: string | null;
    lotacoes: {
      unidadeId: string;
    }[];
  };
}) {
  if (
    params.permissoes.includes("relatorios:exportar:global") ||
    params.permissoes.includes("apuracao:consultar:global")
  ) {
    return true;
  }

  if (
    (params.permissoes.includes("relatorios:exportar:proprio") ||
      params.permissoes.includes("espelho-ponto:visualizar:proprio")) &&
    params.servidor.usuarioId === params.usuarioId
  ) {
    return true;
  }

  const podeExportarComoChefia =
    params.permissoes.includes("homologacao:gerenciar:chefia") ||
    params.permissoes.includes("minha-equipe:consultar:chefia") ||
    params.permissoes.includes("relatorios-gerenciais:exportar:chefia");

  if (!podeExportarComoChefia) {
    return false;
  }

  const unidadesSubordinadas = await listarIdsUnidadesSubordinadasPorUsuario(
    params.usuarioId,
  );

  return unidadesSubordinadas.some((unidadeId) =>
    params.servidor.lotacoes.some((lotacao) => lotacao.unidadeId === unidadeId),
  );
}

async function gerarBancoHorasPdf(job: Job<RelatorioExportacaoJobData>) {
  const servidorId = filtro(job.data, "servidorId");
  const ano = numeroFiltro(job.data, "ano");
  const mes = numeroFiltro(job.data, "mes");

  if (!servidorId) {
    throw new Error("Servidor nao informado.");
  }

  const dados = await buscarDadosBancoHorasPdf({ servidorId, ano, mes });

  if (!dados.servidor) {
    throw new Error("Servidor nao encontrado.");
  }

  const documento = React.createElement(BancoHorasPdfDocument, {
    dados,
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(documento);
  const referencia =
    ano && mes ? `${String(mes).padStart(2, "0")}-${ano}` : "historico";
  const nomeArquivo = `banco-horas-${dados.servidor.matricula}-${referencia}.pdf`;

  return salvarRelatorioExportado({
    jobId: String(job.id),
    nomeArquivo,
    contentType: "application/pdf",
    conteudo: buffer,
  });
}

async function gerarBoletimFrequenciaPdf(job: Job<RelatorioExportacaoJobData>) {
  const boletimId = filtro(job.data, "boletimId");

  if (!boletimId) {
    throw new Error("Boletim nao informado.");
  }

  const boletim = await prisma.boletimFrequencia.findUnique({
    where: {
      id: boletimId,
    },
    include: {
      unidade: {
        include: {
          orgao: true,
        },
      },
      geradoPor: true,
      encaminhadoPor: true,
      recebidoPor: true,
    },
  });

  if (!boletim) {
    throw new Error("Boletim nao encontrado.");
  }

  const itensBoletim = await prisma.boletimFrequenciaServidor.findMany({
    where: {
      boletimId: boletim.id,
    },
    include: {
      servidor: {
        include: {
          usuario: true,
          lotacoes: {
            where: {
              status: "ATIVO",
            },
            include: {
              unidade: {
                select: {
                  sigla: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const servidoresBoletim = itensBoletim
    .map((item) => ({
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
      servidor: {
        matricula: item.servidor.matricula,
        nomeFuncional: item.servidor.nomeFuncional,
        usuario: {
          nome: item.servidor.usuario.nome,
        },
        lotacoes: item.servidor.lotacoes.map((lotacao) => ({
          unidade: {
            sigla: lotacao.unidade.sigla,
          },
        })),
      },
    }))
    .sort((a, b) => a.servidor.matricula.localeCompare(b.servidor.matricula));

  const documento = React.createElement(BoletimFrequenciaPdfDocument, {
    boletim: {
      unidade: {
        sigla: boletim.unidade.sigla,
        nome: boletim.unidade.nome,
        uf: boletim.unidade.uf,
        orgao: {
          sigla: boletim.unidade.orgao.sigla,
          nome: boletim.unidade.orgao.nome,
        },
      },
      anoReferencia: boletim.anoReferencia,
      mesReferencia: boletim.mesReferencia,
      status: boletim.status,
      processoSei: boletim.processoSei,
      numeroSei: boletim.numeroSei,
      observacao: boletim.observacao,
      totalServidores: boletim.totalServidores,
      totalHomologados: boletim.totalHomologados,
      totalComRessalva: boletim.totalComRessalva,
      totalFaltas: boletim.totalFaltas,
      totalCargaPrevistaMinutos: boletim.totalCargaPrevistaMinutos,
      totalTrabalhadoMinutos: boletim.totalTrabalhadoMinutos,
      totalCreditoMinutos: boletim.totalCreditoMinutos,
      totalDebitoMinutos: boletim.totalDebitoMinutos,
      geradoEm: boletim.geradoEm,
      encaminhadoEm: boletim.encaminhadoEm,
      recebidoEm: boletim.recebidoEm,
      geradoPor: {
        nome: boletim.geradoPor.nome,
      },
      encaminhadoPor: boletim.encaminhadoPor
        ? {
            nome: boletim.encaminhadoPor.nome,
          }
        : null,
      recebidoPor: boletim.recebidoPor
        ? {
            nome: boletim.recebidoPor.nome,
          }
        : null,
      servidores: servidoresBoletim,
    },
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(documento);
  const nomeArquivo = `boletim-frequencia-${boletim.unidade.sigla}-${String(
    boletim.mesReferencia,
  ).padStart(2, "0")}-${boletim.anoReferencia}.pdf`;

  return salvarRelatorioExportado({
    jobId: String(job.id),
    nomeArquivo,
    contentType: "application/pdf",
    conteudo: buffer,
  });
}

async function processarRelatorioExportacao(job: Job<RelatorioExportacaoJobData>) {
  await job.updateProgress({ etapa: "Gerando relatorio.", percentual: 10 });

  if (job.data.tipo === "GERENCIAL" && job.data.formato === "PDF") {
    const resultado = await gerarGerencialPdf(job);
    await job.updateProgress({ etapa: "Relatorio concluido.", percentual: 100 });
    return resultado;
  }

  if (job.data.tipo === "LOTACOES_CHEFIAS" && job.data.formato === "PDF") {
    const resultado = await gerarLotacoesChefiasPdf(job);
    await job.updateProgress({ etapa: "Relatorio concluido.", percentual: 100 });
    return resultado;
  }

  if (job.data.tipo === "HOMOLOGACAO" && job.data.formato === "CSV") {
    const resultado = await gerarHomologacaoCsv(job);
    await job.updateProgress({ etapa: "Relatorio concluido.", percentual: 100 });
    return resultado;
  }

  if (job.data.tipo === "HOMOLOGACAO" && job.data.formato === "PDF") {
    const resultado = await gerarHomologacaoPdf(job);
    await job.updateProgress({ etapa: "Relatorio concluido.", percentual: 100 });
    return resultado;
  }

  if (job.data.tipo === "ESPELHO_PONTO" && job.data.formato === "PDF") {
    const resultado = await gerarEspelhoPontoPdf(job);
    await job.updateProgress({ etapa: "Relatorio concluido.", percentual: 100 });
    return resultado;
  }

  if (job.data.tipo === "BANCO_HORAS" && job.data.formato === "PDF") {
    const resultado = await gerarBancoHorasPdf(job);
    await job.updateProgress({ etapa: "Relatorio concluido.", percentual: 100 });
    return resultado;
  }

  if (job.data.tipo === "BOLETIM_FREQUENCIA" && job.data.formato === "PDF") {
    const resultado = await gerarBoletimFrequenciaPdf(job);
    await job.updateProgress({ etapa: "Relatorio concluido.", percentual: 100 });
    return resultado;
  }

  throw new Error(`Relatorio nao suportado: ${job.data.tipo}/${job.data.formato}`);
}

export function criarRelatorioExportacaoWorker() {
  return new Worker<RelatorioExportacaoJobData>(
    RELATORIO_EXPORTACAO_QUEUE_NAME,
    processarRelatorioExportacao,
    {
      connection: relatorioExportacaoConnection,
      concurrency: Math.max(Number(process.env.RELATORIO_EXPORTACAO_CONCURRENCY ?? "1"), 1),
    },
  );
}
