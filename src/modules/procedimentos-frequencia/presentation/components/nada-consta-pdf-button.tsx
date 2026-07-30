"use client";

import { Download } from "lucide-react";

import type { NadaConstaFrequenciaResumo } from "../../application/actions/emitir-nada-consta-frequencia.action";

function minutosParaHora(minutos: number) {
  const sinal = minutos < 0 ? "-" : "";
  const absoluto = Math.abs(minutos);
  return `${sinal}${String(Math.floor(absoluto / 60)).padStart(2, "0")}:${String(
    absoluto % 60,
  ).padStart(2, "0")}`;
}

async function carregarImagemBase64(url: string) {
  const resposta = await fetch(url);
  const blob = await resposta.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatarSecaoJudiciaria(valor?: string | null) {
  if (!valor?.trim()) return "";

  return valor
    .trim()
    .replace(/\bSECAO\b/gi, "SEÇÃO")
    .replace(/\bSUBSECAO\b/gi, "SUBSEÇÃO")
    .replace(/\bJUDICIARIA\b/gi, "JUDICIÁRIA")
    .replace(/\bJUDICIARIO\b/gi, "JUDICIÁRIO");
}

export function NadaConstaPdfButton({
  resumo,
  emitidoEm,
  processoSei,
  className = "",
  label = "PDF",
}: {
  resumo: NadaConstaFrequenciaResumo;
  emitidoEm?: Date | string | null;
  processoSei?: string | null;
  className?: string;
  label?: string;
}) {
  const exportarPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margem = 48;
    const largura = doc.internal.pageSize.getWidth();
    let y = 44;

    try {
      const brasao = await carregarImagemBase64("/brasao-republica.png");
      doc.addImage(brasao, "PNG", margem, y - 6, 42, 42);
    } catch {
      // A emissão do PDF não deve falhar se o brasão não estiver disponível.
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PODER JUDICIÁRIO", largura / 2, y, { align: "center" });
    y += 14;
    doc.text("JUSTIÇA FEDERAL DA 1ª REGIÃO", largura / 2, y, {
      align: "center",
    });
    y += 14;
    doc.text(
      formatarSecaoJudiciaria(resumo.secaoJudiciaria ?? resumo.orgaoSigla),
      largura / 2,
      y,
      { align: "center" },
    );
    y += 14;
    doc.setFontSize(10);
    doc.text("Sistema Eletrônico de Controle de Ponto - SECP", largura / 2, y, {
      align: "center",
    });
    y += 30;
    doc.setDrawColor(180);
    doc.line(margem, y, largura - margem, y);
    y += 32;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Nada Consta de Frequência", margem, y);
    y += 26;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Servidor: ${resumo.servidorNome}`, margem, y);
    y += 16;
    doc.text(`Matrícula: ${resumo.servidorMatricula}`, margem, y);
    y += 16;
    doc.text(`Órgão: ${resumo.orgaoSigla}`, margem, y);
    y += 16;
    doc.text(`Processo SEI: ${processoSei || "Não informado"}`, margem, y);
    y += 22;

    const semPendencias = resumo.resultado === "NADA_CONSTA";
    doc.setFont("helvetica", "bold");
    doc.text(
      `Resultado: ${semPendencias ? "Nada consta" : "Constam pendências"}`,
      margem,
      y,
    );
    y += 22;

    doc.setFont("helvetica", "normal");
    const linhas = doc.splitTextToSize(resumo.mensagem, 500) as string[];
    doc.text(linhas, margem, y);
    y += linhas.length * 14 + 24;

    doc.text(
      `Saldo de banco de horas: ${minutosParaHora(resumo.saldoBancoHorasMinutos)}`,
      margem,
      y,
    );
    y += 16;
    doc.text(
      `Débitos vencidos: ${minutosParaHora(resumo.debitosVencidosMinutos)}`,
      margem,
      y,
    );
    y += 16;
    doc.text(`Faltas não resolvidas: ${resumo.faltasNaoResolvidas}`, margem, y);
    y += 16;
    doc.text(
      `Homologações pendentes: ${resumo.pendenciasHomologacao}`,
      margem,
      y,
    );
    y += 32;

    doc.setFontSize(9);
    const dataEmissao = emitidoEm ? new Date(emitidoEm) : new Date();
    doc.text(`Emitido em ${dataEmissao.toLocaleString("pt-BR")}.`, margem, y);

    doc.save(`nada-consta-${resumo.servidorMatricula}.pdf`);
  };

  return (
    <button
      type="button"
      onClick={exportarPdf}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-bold text-blue-900 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${className}`}
    >
      <Download className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
