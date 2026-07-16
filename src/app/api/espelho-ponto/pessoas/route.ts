import { NextRequest, NextResponse } from "next/server";

import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { perfilAtivoEhChefia } from "@/modules/auth/application/services/perfil-chefia.service";
import {
  obterPermissoesDaSessao,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { listarServidoresParaEspelhoPonto } from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

function normalizarCompetencia(competencia: string | null) {
  const match = competencia?.match(/^(\d{4})-(\d{2})$/);
  const hoje = new Date();
  const ano = match ? Number(match[1]) : hoje.getFullYear();
  const mes = match ? Number(match[2]) : hoje.getMonth() + 1;

  return {
    anoReferencia: ano,
    mesReferencia: mes,
  };
}

async function getEspelhoPontoPessoas(request: NextRequest) {
  const permissoes = await obterPermissoesDaSessao();

  if (!permissoes.permitido) {
    return NextResponse.json({ options: [] }, { status: 401 });
  }

  const podeConsultarGlobal = usuarioPossuiPermissaoNoPerfil(
    permissoes.perfilAtivoCodigo,
    permissoes.permissoes,
    "apuracao:consultar:global",
  );
  const perfilChefiaAtivo = perfilAtivoEhChefia({
    perfilAtivoCodigo: permissoes.perfilAtivoCodigo,
    permissoes: permissoes.permissoes,
  });
  const podeConsultarTodosServidores =
    podeConsultarGlobal && !perfilChefiaAtivo;

  if (!podeConsultarTodosServidores && !perfilChefiaAtivo) {
    return NextResponse.json({ options: [] }, { status: 403 });
  }

  const busca = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (busca.length < 2) {
    return NextResponse.json({ options: [] });
  }

  const { anoReferencia, mesReferencia } = normalizarCompetencia(
    request.nextUrl.searchParams.get("competencia"),
  );
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const servidores = await listarServidoresParaEspelhoPonto({
    usuarioId: perfilChefiaAtivo ? permissoes.usuarioId : undefined,
    anoReferencia,
    mesReferencia,
    escopo: perfilChefiaAtivo ? "chefia" : "global",
    orgaoIdsPermitidos: escopoOrgao.global ? undefined : escopoOrgao.orgaoIds,
    busca,
    limite: 30,
  });

  return NextResponse.json({
    options: servidores.map((servidor) => {
      const nome = nomeServidor(servidor) || servidor.matricula;

      return {
        value: servidor.id,
        label: `${servidor.matricula} - ${nome}`,
        searchText: `${servidor.matricula} ${nome}`,
      };
    }),
  });
}

export const GET = getEspelhoPontoPessoas;
