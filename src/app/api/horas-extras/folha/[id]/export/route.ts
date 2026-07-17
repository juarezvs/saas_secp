import { NextResponse } from "next/server";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { buscarLoteFolhaHorasExtrasPorId } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-folha.repository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function csvValor(valor: string | number | null | undefined) {
  const texto = String(valor ?? "");
  return `"${texto.replaceAll('"', '""')}"`;
}

function formatarData(data: Date) {
  return data.toISOString().slice(0, 10);
}

export async function GET(_request: Request, context: RouteContext) {
  const permissao = await exigirPermissao("horas-extras:exportar:global");
  const { id } = await context.params;
  const lote = await buscarLoteFolhaHorasExtrasPorId(id);

  if (!lote) {
    return NextResponse.json({ error: "Lote nao encontrado." }, { status: 404 });
  }

  if (
    !permissao.perfilAtivoEscopoGlobal &&
    permissao.orgaoIds?.length &&
    !permissao.orgaoIds.includes(lote.orgaoId)
  ) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const linhas = [
    [
      "competencia",
      "matricula",
      "servidor",
      "data",
      "rubrica",
      "percentual",
      "minutos",
      "valor",
      "authorization_id",
      "request_id",
    ],
  ];

  for (const employee of lote.employees) {
    for (const line of employee.lines) {
      linhas.push([
        lote.competence,
        employee.registration ?? "",
        employee.employeeName ?? "",
        formatarData(line.date),
        line.rubricaCode ?? "",
        line.ratePercent.toString(),
        String(line.minutes),
        line.amount.toString(),
        line.authorizationId,
        line.requestId,
      ]);
    }
  }

  const csv = `${linhas
    .map((linha) => linha.map((valor) => csvValor(valor)).join(";"))
    .join("\n")}\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="horas-extras-${lote.competence}.csv"`,
    },
  });
}
