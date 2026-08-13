import { NextResponse } from "next/server";

import {
  obterPermissoesDaSessao,
  possuiPermissaoNaLista,
} from "@/modules/auth/application/services/permissao.service";
import { listarRelatorioAnaliticoHorasExtras } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-relatorios.repository";

function podeExportar(permissoes: string[]) {
  return (
    possuiPermissaoNaLista(permissoes, "horas-extras:visualizar-folha:global") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:visualizar-folha:seccional") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:visualizar-execucao:global") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:visualizar-execucao:seccional")
  );
}

function csvValor(valor: string | number | null | undefined) {
  return `"${String(valor ?? "").replaceAll('"', '""')}"`;
}

function dataIso(data: Date) {
  return data.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const permissao = await obterPermissoesDaSessao();

  if (!permissao.permitido || !podeExportar(permissao.permissoes)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const url = new URL(request.url);
  const competencia = url.searchParams.get("competencia");
  const orgaoId = url.searchParams.get("orgaoId");

  if (
    orgaoId &&
    !permissao.perfilAtivoEscopoGlobal &&
    permissao.orgaoIds?.length &&
    !permissao.orgaoIds.includes(orgaoId)
  ) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const itens = await listarRelatorioAnaliticoHorasExtras({
    competencia,
    orgaoId,
    orgaoIds: permissao.orgaoIds,
    escopoGlobal: permissao.perfilAtivoEscopoGlobal,
  });
  const linhas = [
    [
      "competencia",
      "orgao",
      "processo_sei",
      "documento_autorizacao",
      "matricula",
      "servidor",
      "unidade",
      "data",
      "inicio",
      "fim",
      "tipo_dia",
      "minutos",
      "percentual",
      "rubrica",
      "remuneracao_base",
      "divisor_minutos",
      "valor",
      "calculo_id",
      "calculo_item_id",
    ],
  ];

  for (const item of itens) {
    linhas.push([
      item.calculo.competencia,
      item.calculo.autorizacao.orgao.sigla,
      item.calculo.autorizacao.processoSei,
      item.calculo.autorizacao.documentoAutorizacao,
      item.servidorAutorizado.matriculaSnapshot,
      item.servidorAutorizado.nomeSnapshot,
      item.servidorAutorizado.unidadeSnapshot ?? "",
      dataIso(item.data),
      item.inicio,
      item.fim,
      item.tipoDia,
      String(item.minutos),
      item.percentual.toString(),
      item.rubrica ?? "",
      (item.remuneracaoBaseCentavos / 100).toFixed(2),
      String(item.divisorMinutos),
      (item.valorCentavos / 100).toFixed(2),
      item.calculoId,
      item.id,
    ]);
  }

  const csv = `${linhas
    .map((linha) => linha.map((valor) => csvValor(valor)).join(";"))
    .join("\n")}\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="horas-extras-analitico-${competencia ?? "todas"}.csv"`,
    },
  });
}
