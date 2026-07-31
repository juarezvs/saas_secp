import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { obterPermissoesDaSessao } from "@/modules/auth/application/services/permissao.service";
import {
  resolverEscopoMarcacoesBrutas,
  resolverOrgaoIdsFiltroMarcacoesBrutas,
} from "@/modules/marcacoes-brutas/application/services/escopo-marcacoes-brutas.service";
import { listarMarcacoesBrutasParaExportacao } from "@/modules/marcacoes-brutas/infrastructure/repositories/marcacao-bruta.repository";
import { normalizarFusoHorario } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const runtime = "nodejs";

function formatarDataHora(
  valor: Date | string | null | undefined,
  fusoHorario?: string | null,
) {
  if (!valor) return "";
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: normalizarFusoHorario(fusoHorario),
  }).format(data);
}

export async function GET(request: Request) {
  const permissao = await obterPermissoesDaSessao();

  const permissoes = permissao.permissoes;
  if (
    !permissao.permitido ||
    !permissoes.includes("marcacoes:consultar:global") &&
    !permissoes.includes("marcacoes:consultar:seccional") &&
    !permissoes.includes("marcacoes:gerenciar:global") &&
    !permissoes.includes("marcacoes:gerenciar:seccional") &&
    !permissoes.includes("marcacoes:excluir:global") &&
    !permissoes.includes("marcacoes:excluir:seccional") &&
    !permissoes.includes("afd:importar:global") &&
    !permissoes.includes("afd:importar:seccional")
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const escopoMarcacoesBrutas = await resolverEscopoMarcacoesBrutas(
    permissao,
    escopoOrgao,
  );
  const orgaoId = url.searchParams.get("orgaoId") ?? "";
  const orgaoIdsFiltro = resolverOrgaoIdsFiltroMarcacoesBrutas({
    orgaoId,
    orgaoIdsPermitidos: escopoMarcacoesBrutas.orgaoIdsPermitidos,
  });
  const equipamentosFiltro = orgaoIdsFiltro
    ? await prisma.equipamentoBiometrico.findMany({
        where: {
          ativo: true,
          OR: [
            { orgaoId: { in: orgaoIdsFiltro } },
            { unidade: { orgaoId: { in: orgaoIdsFiltro } } },
          ],
        },
        select: { id: true, codigo: true },
      })
    : [];
  const marcacoes = await listarMarcacoesBrutasParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    origem: url.searchParams.get("origem") ?? "",
    processada: url.searchParams.get("processada") ?? "",
    dataInicio: url.searchParams.get("dataInicio") ?? "",
    dataFim: url.searchParams.get("dataFim") ?? "",
    cpf: url.searchParams.get("cpf") ?? "",
    matricula: url.searchParams.get("matricula") ?? "",
    servidorId: url.searchParams.get("servidorId") ?? "",
    equipamentoCodigo: url.searchParams.get("equipamentoCodigo") ?? "",
    nsr: url.searchParams.get("nsr") ?? "",
    orgaoId: orgaoId ? orgaoIdsFiltro?.[0] : undefined,
    orgaoIdsPermitidos: orgaoIdsFiltro ?? escopoMarcacoesBrutas.orgaoIdsPermitidos,
    servidorIdsPermitidos: escopoMarcacoesBrutas.servidorIdsPermitidos,
    equipamentoIdsPermitidos: equipamentosFiltro.map(
      (equipamento) => equipamento.id,
    ),
    equipamentoCodigosPermitidos: equipamentosFiltro.map(
      (equipamento) => equipamento.codigo,
    ),
  });

  const linhas = [
    [
      "Data/hora",
      "Origem",
      "CPF",
      "Matricula",
      "Servidor vinculado",
      "Equipamento",
      "NSR",
      "Codigo externo",
      "Processada",
      "Marcacao",
    ],
    ...marcacoes.map((item) => [
      formatarDataHora(item.dataHora, item.marcacao?.fusoHorario),
      item.origem,
      item.cpf ?? "",
      item.matricula ?? "",
      nomeServidor(item.servidor),
      item.equipamentoCodigo ?? "",
      item.nsr ?? "",
      item.codigoExterno ?? "",
      item.processada ? "Sim" : "Nao",
      item.marcacao ? `${item.marcacao.tipo} / ${item.marcacao.status}` : "",
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
      "Content-Disposition": `attachment; filename="marcacoes-brutas.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
