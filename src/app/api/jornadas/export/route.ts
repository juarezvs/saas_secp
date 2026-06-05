import { auth } from "@/auth";
import { listarJornadasParaExportacao } from "@/modules/jornadas/infrastructure/repositories/jornada.repository";

export const runtime = "nodejs";

function minutosParaHoras(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${resto}`;
}

export async function GET(request: Request) {
  const session = await auth();

  if (
    !session?.user?.perfilAtivo?.permissoes?.includes(
      "jornadas:gerenciar:global",
    )
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const jornadas = await listarJornadasParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    codigo: url.searchParams.get("codigo") ?? "",
    nome: url.searchParams.get("nome") ?? "",
    tipo: url.searchParams.get("tipo") ?? "",
    status: url.searchParams.get("status") ?? "",
  });

  const linhas = [
    [
      "Codigo",
      "Nome",
      "Tipo",
      "Carga",
      "Intervalo",
      "Escalas",
      "Servidores",
      "Status",
    ],
    ...jornadas.map((jornada) => [
      jornada.codigo,
      jornada.nome,
      jornada.tipo,
      minutosParaHoras(jornada.cargaDiariaMinutos),
      jornada.exigeIntervalo
        ? `${jornada.intervaloMinimoMinutos ?? "-"} a ${
            jornada.intervaloMaximoMinutos ?? "-"
          } min`
        : "Nao",
      jornada._count.escalas,
      jornada._count.servidores,
      jornada.ativo ? "Ativa" : "Inativa",
    ]),
  ];

  const csv = linhas
    .map((linha) =>
      linha
        .map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
        .join(";"),
    )
    .join("\n");

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jornadas.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
