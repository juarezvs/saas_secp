import { auth } from "@/auth";
import { listarBoletinsFrequenciaParaExportacao } from "@/modules/boletim-frequencia/infrastructure/repositories/boletim-frequencia.repository";
import { rotuloStatusBoletim } from "@/modules/boletim-frequencia/application/services/formatar-boletim-frequencia.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];
  if (
    !permissoes.includes("boletim-frequencia:gerar:chefia") &&
    !permissoes.includes("boletim-frequencia:consultar:global")
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const boletins = await listarBoletinsFrequenciaParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    anoReferencia: url.searchParams.get("anoReferencia") ?? "",
    mesReferencia: url.searchParams.get("mesReferencia") ?? "",
    unidade: url.searchParams.get("unidade") ?? "",
    status: url.searchParams.get("status") ?? "",
  });

  const linhas = [
    [
      "Referencia",
      "Unidade",
      "Servidores",
      "Status",
      "Processo SEI",
      "Gerado por",
    ],
    ...boletins.map((boletim) => [
      `${String(boletim.mesReferencia).padStart(2, "0")}/${boletim.anoReferencia}`,
      `${boletim.unidade.sigla} - ${boletim.unidade.nome}`,
      boletim._count.servidores,
      rotuloStatusBoletim(boletim.status),
      boletim.processoSei ?? "",
      boletim.geradoPor.nome,
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
      "Content-Disposition": `attachment; filename="boletins-frequencia.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
