import { NextResponse } from "next/server";
import { Decimal } from "@prisma/client/runtime/client";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { buscarLoteFolhaHorasExtrasPorId } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-folha.repository";
import { podeAcessarOrgaoHorasExtras } from "@/modules/horas-extras/application/services/escopo-horas-extras.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function csvValor(valor: string | number | null | undefined) {
  const original = String(valor ?? "");
  const texto = /^\s*[=+\-@]/.test(original) ? `'${original}` : original;
  return `"${texto.replaceAll('"', '""')}"`;
}

function formatarData(data: Date) {
  return data.toISOString().slice(0, 10);
}

function gerarCsvDetalhado(lote: NonNullable<Awaited<ReturnType<typeof buscarLoteFolhaHorasExtrasPorId>>>) {
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
      "calculo_id",
      "calculo_item_id",
    ],
  ];

  for (const employee of lote.employees) {
    for (const line of employee.lines) {
      const metadata =
        line.metadata && typeof line.metadata === "object"
          ? (line.metadata as Record<string, unknown>)
          : {};

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
        typeof metadata.calculoId === "string" ? metadata.calculoId : "",
        typeof metadata.calculoItemId === "string" ? metadata.calculoItemId : "",
      ]);
    }
  }

  return `${linhas
    .map((linha) => linha.map((valor) => csvValor(valor)).join(";"))
    .join("\n")}\n`;
}

function gerarCsvResumo(lote: NonNullable<Awaited<ReturnType<typeof buscarLoteFolhaHorasExtrasPorId>>>) {
  const grupos = new Map<
    string,
    {
      matricula: string;
      nome: string;
      rubrica: string;
      minutos: number;
      valor: Decimal;
    }
  >();

  for (const employee of lote.employees) {
    for (const line of employee.lines) {
      const rubrica = line.rubricaCode ?? "";
      const chave = `${employee.registration ?? ""}:${rubrica}`;
      const grupo = grupos.get(chave) ?? {
        matricula: employee.registration ?? "",
        nome: employee.employeeName ?? "",
        rubrica,
        minutos: 0,
        valor: new Decimal(0),
      };

      grupo.minutos += line.minutes;
      grupo.valor = grupo.valor.plus(line.amount.toString());
      grupos.set(chave, grupo);
    }
  }

  const linhas = [
    [
      "competencia",
      "matricula",
      "nome",
      "rubrica",
      "quantidade_horas",
      "minutos",
      "valor",
    ],
    ...[...grupos.values()].map((grupo) => [
      lote.competence,
      grupo.matricula,
      grupo.nome,
      grupo.rubrica,
      (grupo.minutos / 60).toFixed(2),
      String(grupo.minutos),
      grupo.valor.toFixed(2),
    ]),
  ];

  return `${linhas
    .map((linha) => linha.map((valor) => csvValor(valor)).join(";"))
    .join("\n")}\n`;
}

export async function GET(request: Request, context: RouteContext) {
  const permissao = await exigirPermissao("horas-extras:exportar:global");
  const { id } = await context.params;
  const lote = await buscarLoteFolhaHorasExtrasPorId(id);

  if (!lote) {
    return NextResponse.json({ error: "Lote nao encontrado." }, { status: 404 });
  }

  if (
    !podeAcessarOrgaoHorasExtras({
      global: permissao.perfilAtivoEscopoGlobal === true,
      orgaoIds: permissao.orgaoIds ?? [],
    }, lote.orgaoId)
  ) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const layout = new URL(request.url).searchParams.get("layout");
  if (layout === "oficial") {
    return NextResponse.json({
      error: "Leiaute oficial de folha pendente de homologacao. Utilize o resumo interno para conferencia.",
      code: "LEIAUTE_FOLHA_NAO_HOMOLOGADO",
    }, { status: 409 });
  }
  if (layout && !["detalhado", "resumo"].includes(layout)) {
    return NextResponse.json({ error: "Leiaute de exportacao desconhecido." }, { status: 400 });
  }
  const resumo = layout === "resumo";
  const csv = resumo ? gerarCsvResumo(lote) : gerarCsvDetalhado(lote);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="horas-extras-${resumo ? "resumo-interno" : "detalhado"}-${lote.competence}.csv"`,
    },
  });
}
