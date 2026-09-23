import { registrarAuditoriaEvento } from "@/modules/auditoria/application/services/registrar-auditoria.service";
import {
  obterPermissoesDaSessao,
  usuarioPossuiAlgumaPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import {
  PERMISSOES_ACOMPANHAMENTO_ESTAGIO,
  carregarAcompanhamentoEstagio,
  carregarAcompanhamentoEstagioPorServidor,
  normalizarCompetenciaEstagio,
} from "@/modules/acompanhamento-estagio/application/services/acompanhamento-estagio.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const permissao = await obterPermissoesDaSessao();

  if (!permissao.permitido) {
    return new Response("Nao autenticado.", { status: 401 });
  }

  const url = new URL(request.url);
  const { ano, mes } = normalizarCompetenciaEstagio({
    competencia: url.searchParams.get("competencia"),
    anoReferencia: url.searchParams.get("anoReferencia"),
    mesReferencia: url.searchParams.get("mesReferencia"),
  });
  const servidorId = url.searchParams.get("servidorId");
  const podeExportarProprio = usuarioPossuiAlgumaPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    [PERMISSOES_ACOMPANHAMENTO_ESTAGIO.exportar],
  );
  const podeSupervisionar = usuarioPossuiAlgumaPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    [PERMISSOES_ACOMPANHAMENTO_ESTAGIO.supervisionar],
  );
  const podeExportarSeccional = usuarioPossuiAlgumaPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    [PERMISSOES_ACOMPANHAMENTO_ESTAGIO.exportarSeccional],
  );
  const dados = servidorId
    ? podeExportarSeccional || podeSupervisionar
      ? await carregarAcompanhamentoEstagioPorServidor({
          servidorId,
          usuarioId: permissao.usuarioId ?? "",
          ano,
          mes,
          modo: podeExportarSeccional ? "CONSULTA" : "SUPERVISOR",
          orgaoIds: permissao.orgaoIds,
        })
      : null
    : podeExportarProprio
      ? await carregarAcompanhamentoEstagio({
          usuarioId: permissao.usuarioId ?? "",
          ano,
          mes,
        })
      : null;

  if (!dados) {
    return new Response("Acompanhamento nao encontrado.", {
      status: servidorId || podeExportarProprio ? 404 : 403,
    });
  }

  const rascunho = dados.acompanhamento.status !== "FECHADO";
  const linhas = [
    ["ACOMPANHAMENTO MENSAL DE ESTAGIO"],
    ["Status", rascunho ? "RASCUNHO" : "OFICIAL"],
    ["Nome", dados.servidor.nome],
    ["Matricula", dados.servidor.matricula],
    ["Lotacao", dados.servidor.lotacao],
    ["Mes/Ano", dados.competencia.label],
    ["Curso", dados.acompanhamento.curso],
    ["Supervisor", dados.acompanhamento.supervisor],
    [
      "Assinatura do estagiario",
      dados.acompanhamento.assinatura
        ? `Assinado eletronicamente por ${dados.acompanhamento.assinatura.nome} em ${formatarDataAssinatura(
            dados.acompanhamento.assinatura.assinadoEm,
          )}`
        : "",
    ],
    [
      "Assinatura do supervisor",
      dados.acompanhamento.assinaturaSupervisor
        ? `Assinado eletronicamente por ${dados.acompanhamento.assinaturaSupervisor.nome} em ${formatarDataAssinatura(
            dados.acompanhamento.assinaturaSupervisor.assinadoEm,
          )}`
        : "",
    ],
    [],
    ["Data", "Atividades desenvolvidas", "N. de horas"],
    ...dados.linhas.map((linha) => [
      linha.dataLabel,
      linha.atividades,
      linha.horasLabel,
    ]),
  ];
  const csv = `\uFEFF${linhas.map(serializarCsv).join("\r\n")}`;
  const filename = `acompanhamento-estagio-${dados.servidor.matricula}-${String(
    mes,
  ).padStart(2, "0")}-${ano}${rascunho ? "-rascunho" : ""}.csv`;

  await registrarAuditoriaEvento({
    usuarioId: permissao.usuarioId,
    entidade: "AcompanhamentoEstagioMensal",
    entidadeId: dados.acompanhamento.id,
    acao: rascunho
      ? "EXPORTAR_ACOMPANHAMENTO_ESTAGIO_EXCEL_RASCUNHO"
      : "EXPORTAR_ACOMPANHAMENTO_ESTAGIO_EXCEL",
    metadados: {
      anoReferencia: ano,
      mesReferencia: mes,
      servidorId: dados.servidor.id,
      matricula: dados.servidor.matricula,
      status: dados.acompanhamento.status,
    },
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function serializarCsv(colunas: string[]) {
  return colunas
    .map((coluna) => `"${String(coluna).replaceAll('"', '""')}"`)
    .join(";");
}

function formatarDataAssinatura(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Manaus",
  }).format(new Date(valor));
}
