import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { listarBoletinsFrequenciaParaExportacao } from "@/modules/boletim-frequencia/infrastructure/repositories/boletim-frequencia.repository";
import { rotuloStatusBoletim } from "@/modules/boletim-frequencia/application/services/formatar-boletim-frequencia.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";

export const runtime = "nodejs";

async function getBoletimFrequenciaExport(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const podeAcessar = usuarioPossuiAlgumaPermissaoNoPerfil(
    session.user.perfilAtivo?.codigo,
    session.user.perfilAtivo?.permissoes,
    [
      "boletim-frequencia:gerar:chefia",
      "boletim-frequencia:encaminhar:chefia",
      "boletim-frequencia:receber:global",
      "boletim-frequencia:consultar:global",
    ],
  );

  if (!podeAcessar) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const permissoes = session.user.perfilAtivo?.permissoes ?? [];
  const podeConsultarGlobal = permissoes.some((permissao) =>
    [
      "boletim-frequencia:receber:global",
      "boletim-frequencia:consultar:global",
    ].includes(permissao),
  );
  const unidadeIdsPermitidos = podeConsultarGlobal
    ? undefined
    : await listarIdsUnidadesSubordinadasPorUsuario(session.user.id);
  const boletins = await listarBoletinsFrequenciaParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    anoReferencia: url.searchParams.get("anoReferencia") ?? "",
    mesReferencia: url.searchParams.get("mesReferencia") ?? "",
    unidade: url.searchParams.get("unidade") ?? "",
    unidadeId: url.searchParams.get("unidadeId") ?? "",
    unidadeIds: url.searchParams.getAll("unidadeIds"),
    unidadeIdsPermitidos,
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

export const GET = withHttpMetrics(
  "/api/boletim-frequencia/export",
  getBoletimFrequenciaExport,
);
