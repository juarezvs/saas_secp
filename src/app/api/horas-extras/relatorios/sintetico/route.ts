import { NextResponse } from "next/server";

import {
  obterPermissoesDaSessao,
  possuiPermissaoNaLista,
} from "@/modules/auth/application/services/permissao.service";
import { listarRelatorioSinteticoHorasExtras } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-relatorios.repository";

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

  const itens = await listarRelatorioSinteticoHorasExtras({
    competencia,
    orgaoId,
    orgaoIds: permissao.orgaoIds,
    escopoGlobal: permissao.perfilAtivoEscopoGlobal,
  });
  const linhas = [
    [
      "competencia",
      "orgao",
      "matricula",
      "servidor",
      "unidade",
      "minutos",
      "valor",
      "rubricas",
      "processos",
    ],
  ];

  for (const item of itens) {
    linhas.push([
      item.competencia,
      item.orgao,
      item.matricula,
      item.nome,
      item.unidade,
      String(item.minutos),
      (item.valorCentavos / 100).toFixed(2),
      item.rubricas.join(","),
      item.processos.join(","),
    ]);
  }

  const csv = `${linhas
    .map((linha) => linha.map((valor) => csvValor(valor)).join(";"))
    .join("\n")}\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="horas-extras-sintetico-${competencia ?? "todas"}.csv"`,
    },
  });
}
