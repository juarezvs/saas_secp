"use client";

import { Download, FileSpreadsheet } from "lucide-react";

export type RelatorioSubstituicaoItem = {
  id: string;
  seccional: string;
  unidade: string;
  titular: string;
  titularMatricula: string;
  substituto: string;
  substitutoMatricula: string;
  funcao: string;
  tipo: string;
  status: string;
  periodoSubstituicao: string;
  periodoApurado: string;
  diasElegiveis: string;
  quantidadeDias: number;
  afastamentos: string;
  faltas: string;
};

function baixarArquivo(nome: string, conteudo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

function csvValor(valor: string | number) {
  return `"${String(valor).replace(/"/g, '""')}"`;
}

export function RelatorioSubstituicoesExport({
  itens,
  periodo,
}: {
  itens: RelatorioSubstituicaoItem[];
  periodo: string;
}) {
  const exportarCsv = () => {
    const cabecalho = [
      "Seccional",
      "Unidade",
      "Titular",
      "Matrícula titular",
      "Substituto",
      "Matrícula substituto",
      "Função",
      "Período da substituição",
      "Período apurado",
      "Dias elegíveis",
      "Quantidade de dias",
      "Afastamentos",
      "Faltas",
      "Status",
    ];
    const linhas = itens.map((item) =>
      [
        item.seccional,
        item.unidade,
        item.titular,
        item.titularMatricula,
        item.substituto,
        item.substitutoMatricula,
        item.funcao,
        item.periodoSubstituicao,
        item.periodoApurado,
        item.diasElegiveis,
        item.quantidadeDias,
        item.afastamentos,
        item.faltas,
        item.status,
      ]
        .map(csvValor)
        .join(";"),
    );

    baixarArquivo(
      "relatorio-substituicoes-funcao.csv",
      [cabecalho.map(csvValor).join(";"), ...linhas].join("\n"),
      "text/csv;charset=utf-8",
    );
  };

  const exportarPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const margem = 36;
    let y = 42;

    try {
      const resposta = await fetch("/brasao-republica.png");
      const blob = await resposta.blob();
      const brasao = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      doc.addImage(brasao, "PNG", margem, y - 6, 34, 34);
    } catch {
      // Exporta mesmo se a imagem institucional não estiver disponível.
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Relatório de substituições de função", margem + 46, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Período: ${periodo} | Registros: ${itens.length}`, margem + 46, y);
    y += 26;

    doc.setFont("helvetica", "bold");
    doc.text("Substituto", margem, y);
    doc.text("Titular", margem + 145, y);
    doc.text("Função", margem + 290, y);
    doc.text("Dias", margem + 470, y);
    doc.text("Período apurado", margem + 515, y);
    doc.text("Motivo", margem + 630, y);
    y += 12;
    doc.line(margem, y, 805, y);
    y += 14;
    doc.setFont("helvetica", "normal");

    for (const item of itens) {
      if (y > 540) {
        doc.addPage();
        y = 42;
      }

      doc.text(`${item.substitutoMatricula} - ${item.substituto}`, margem, y, {
        maxWidth: 135,
      });
      doc.text(`${item.titularMatricula} - ${item.titular}`, margem + 145, y, {
        maxWidth: 135,
      });
      doc.text(item.funcao, margem + 290, y, { maxWidth: 170 });
      doc.text(String(item.quantidadeDias), margem + 470, y);
      doc.text(item.periodoApurado, margem + 515, y, { maxWidth: 105 });
      doc.text(item.afastamentos || item.faltas || "-", margem + 630, y, {
        maxWidth: 170,
      });
      y += 34;
    }

    doc.save("relatorio-substituicoes-funcao.pdf");
  };

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={exportarCsv}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-[var(--muted)]"
      >
        <FileSpreadsheet className="size-4" aria-hidden="true" />
        Excel
      </button>
      <button
        type="button"
        onClick={exportarPdf}
        className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800"
      >
        <Download className="size-4" aria-hidden="true" />
        PDF
      </button>
    </div>
  );
}
