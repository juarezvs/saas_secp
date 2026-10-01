import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutAction } from "@/modules/auth/application/actions/logout.action";
import { escolherPerfilInicial } from "@/modules/auth/application/services/perfil-servidor-prioritario.service";
import { buscarUsuarioParaLoginPorMatricula } from "@/modules/auth/infrastructure/repositories/usuario-auth.repository";
import { buscarServidorPorUsuarioId } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import {
  contarNotificacoesPerfilChefiaUsuario,
  contarNotificacoesUsuario,
} from "@/modules/notificacoes/application/notificacoes.service";
import {
  buscarIconesItensCatalogoMenu,
  buscarMenusPersonalizadosPorPerfil,
} from "@/modules/menus/infrastructure/repositories/menu-personalizado.repository";
import { listarFavoritosUsuarioPerfil } from "@/modules/favoritos/application/favoritos-usuario-perfil.service";
import {
  PERMISSOES_ACOMPANHAMENTO_ESTAGIO,
  usuarioPossuiSupervisaoEstagioVigente,
} from "@/modules/acompanhamento-estagio/application/services/acompanhamento-estagio.service";
import { buscarFotoServidorDataUrl } from "@/modules/servidores/application/services/foto-servidor.service";
import { descricaoNomeFuncaoServidor } from "@/modules/servidores/application/services/funcao-cargo-servidor.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { buscarRegulamentacaoPontoOrgao } from "@/modules/regulamentacao-ponto/application/services/regulamentacao-ponto.service";
import { AppShellClient } from "./app-shell-client";

type AppShellProps = {
  children: React.ReactNode;
};

type OrgaoInstitucional = {
  id?: string | null;
  sigla?: string | null;
  nome?: string | null;
};

const ROTULOS_UF_JUSTICA_FEDERAL: Record<string, string> = {
  AC: "do Acre",
  AL: "de Alagoas",
  AM: "do Amazonas",
  AP: "do Amapá",
  BA: "da Bahia",
  CE: "do Ceará",
  DF: "do Distrito Federal",
  ES: "do Espírito Santo",
  GO: "de Goiás",
  MA: "do Maranhão",
  MG: "de Minas Gerais",
  MS: "de Mato Grosso do Sul",
  MT: "de Mato Grosso",
  PA: "do Pará",
  PB: "da Paraíba",
  PE: "de Pernambuco",
  PI: "do Piauí",
  PR: "do Paraná",
  RJ: "do Rio de Janeiro",
  RN: "do Rio Grande do Norte",
  RO: "de Rondônia",
  RR: "de Roraima",
  RS: "do Rio Grande do Sul",
  SC: "de Santa Catarina",
  SE: "de Sergipe",
  SP: "de São Paulo",
  TO: "do Tocantins",
};

function removerAcentos(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function obterUfOrgao(orgao?: OrgaoInstitucional | null) {
  const sigla = orgao?.sigla?.trim().toUpperCase() ?? "";
  const ufSigla = sigla.match(/^SJ([A-Z]{2})$/)?.[1];

  if (ufSigla && ROTULOS_UF_JUSTICA_FEDERAL[ufSigla]) {
    return ufSigla;
  }

  const nomeNormalizado = removerAcentos(orgao?.nome ?? "").toUpperCase();

  return Object.entries(ROTULOS_UF_JUSTICA_FEDERAL).find(([, rotulo]) =>
    nomeNormalizado.includes(removerAcentos(rotulo).toUpperCase()),
  )?.[0];
}

function montarRotuloInstituicao(orgao?: OrgaoInstitucional | null) {
  const uf = obterUfOrgao(orgao);
  const rotuloUf = uf ? ROTULOS_UF_JUSTICA_FEDERAL[uf] : null;

  return rotuloUf ? `Justiça Federal ${rotuloUf}` : "Justiça Federal";
}

function montarSiglaLotacao(params: {
  orgaoSigla?: string | null;
  unidadeSigla?: string | null;
}) {
  const orgaoSigla = params.orgaoSigla?.trim().toUpperCase();
  const unidadeSigla = params.unidadeSigla?.trim().toUpperCase();

  if (!unidadeSigla) return orgaoSigla ?? "";
  if (!orgaoSigla || unidadeSigla.startsWith(`${orgaoSigla}-`)) {
    return unidadeSigla;
  }

  return `${orgaoSigla}-${unidadeSigla}`;
}

function compactarNomeFuncao(funcao?: string | null) {
  const funcaoLimpa = funcao?.trim();

  if (!funcaoLimpa) return "";

  return (
    funcaoLimpa
      .split(/\s+(?:DE|DA|DO|DAS|DOS)\s+/i)[0]
      ?.trim()
      .toUpperCase() ?? funcaoLimpa.toUpperCase()
  );
}

function montarRotuloFuncaoLotacao(params: {
  funcao?: string | null;
  siglaLotacao: string;
}) {
  const funcaoCompacta = compactarNomeFuncao(params.funcao);

  if (funcaoCompacta && params.siglaLotacao) {
    return `${funcaoCompacta} - ${params.siglaLotacao}`;
  }

  return funcaoCompacta || params.siglaLotacao;
}

export async function AppShell({ children }: AppShellProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [usuarioAtualizado, servidor] = await Promise.all([
    buscarUsuarioParaLoginPorMatricula(session.user.matricula),
    buscarServidorPorUsuarioId(session.user.id, session.user.matricula),
  ]);
  const lotacaoAtual = servidor?.lotacoes[0];
  const perfisNavegacao =
    usuarioAtualizado?.perfis.length ? usuarioAtualizado.perfis : session.user.perfis;
  const perfilPreferido =
    perfisNavegacao.find(
      (perfil) => perfil.codigo === session.user.perfilAtivo?.codigo,
    ) ??
    usuarioAtualizado?.perfilAtivo ??
    session.user.perfilAtivo ??
    perfisNavegacao[0];
  const perfilAtivo =
    escolherPerfilInicial({
      tipoUsuario: usuarioAtualizado?.tipo ?? session.user.tipo,
      perfis: perfisNavegacao,
      perfilPreferido,
      respeitarPerfilPreferido: Boolean(session.user.perfilAtivo),
    }) ?? perfilPreferido;

  if (!perfilAtivo) {
    redirect("/acesso-negado?motivo=sem-perfil");
  }

  const permissoesAcompanhamentoEstagio = [
    PERMISSOES_ACOMPANHAMENTO_ESTAGIO.consultar,
    PERMISSOES_ACOMPANHAMENTO_ESTAGIO.preencher,
    PERMISSOES_ACOMPANHAMENTO_ESTAGIO.supervisionar,
    PERMISSOES_ACOMPANHAMENTO_ESTAGIO.consultarSeccional,
    PERMISSOES_ACOMPANHAMENTO_ESTAGIO.exportarSeccional,
  ];
  const perfilAtivoJaAcessaAcompanhamentoEstagio =
    permissoesAcompanhamentoEstagio.some((permissao) =>
      perfilAtivo.permissoes.includes(permissao),
    );

  const [totalNotificacoes, favoritosPerfil, alertaChefia, supervisionaEstagio] = await Promise.all([
    contarNotificacoesUsuario(session.user.id, {
      perfilAtivo,
    }),
    listarFavoritosUsuarioPerfil({
      usuarioId: session.user.id,
      perfil: {
        id: perfilAtivo.id,
        permissoes: perfilAtivo.permissoes,
      },
    }),
    perfilAtivo.codigo.toUpperCase() === "SERVIDOR"
      ? contarNotificacoesPerfilChefiaUsuario({
          usuarioId: session.user.id,
          perfis: perfisNavegacao,
          perfilAtivo,
        })
      : Promise.resolve({ total: 0, perfilChefia: null }),
    perfilAtivoJaAcessaAcompanhamentoEstagio
      ? Promise.resolve(false)
      : usuarioPossuiSupervisaoEstagioVigente(session.user.id),
  ]);
  const permissoesPerfilAtivo = supervisionaEstagio
    ? Array.from(
        new Set([
          ...perfilAtivo.permissoes,
          PERMISSOES_ACOMPANHAMENTO_ESTAGIO.supervisionar,
        ]),
      )
    : perfilAtivo.permissoes;

  const fotoCpf = servidor?.cpf;
  const [fotoUrl, menusPersonalizados, iconesItensCatalogo] = await Promise.all([
    buscarFotoServidorDataUrl(fotoCpf),
    buscarMenusPersonalizadosPorPerfil(perfisNavegacao.map((perfil) => perfil.id)),
    buscarIconesItensCatalogoMenu(),
  ]);
  const orgaoInstitucional =
    lotacaoAtual?.unidade.orgao ?? perfilAtivo.orgaos?.[0] ?? null;
  const orgaoIdInstitucional =
    servidor?.orgaoId ?? perfilAtivo.orgaos?.[0]?.id ?? null;
  const regulamentacaoSeccional = await buscarRegulamentacaoPontoOrgao(
    orgaoIdInstitucional,
  );
  const siglaLotacao = montarSiglaLotacao({
    orgaoSigla: orgaoInstitucional?.sigla,
    unidadeSigla: lotacaoAtual?.unidade.sigla,
  });
  const funcaoLotacao = montarRotuloFuncaoLotacao({
    funcao: descricaoNomeFuncaoServidor(servidor),
    siglaLotacao,
  });
  const usuario = {
    nome:
      nomeServidor(servidor) ||
      session.user.nome ||
      session.user.name ||
      "Usuário SECP",
    matricula: session.user.matricula,
    funcaoOuCargo: funcaoLotacao,
    fotoUrl,
    preferenciasAcessibilidade: session.user.preferenciasAcessibilidade,
    unidade: "",
    instituicaoLabel: montarRotuloInstituicao(orgaoInstitucional),
    alertaChefia:
      alertaChefia.total > 0 && alertaChefia.perfilChefia
        ? {
            total: alertaChefia.total,
            perfilCodigo: alertaChefia.perfilChefia.codigo,
            perfilNome: alertaChefia.perfilChefia.nome,
          }
        : null,
    rotinasSeccional: {
      bancoHorasAtivo: regulamentacaoSeccional.bancoHorasAtivo,
      horasExtrasAtivo: regulamentacaoSeccional.horasExtrasAtivo,
    },
    perfilAtivo: {
      id: perfilAtivo.id,
      codigo: perfilAtivo.codigo,
      nome: perfilAtivo.nome,
      permissoes: permissoesPerfilAtivo,
      administrativo: perfilAtivo.administrativo,
      excecao: perfilAtivo.excecao,
      perfilDestinoExcecaoId: perfilAtivo.perfilDestinoExcecaoId,
    },
    perfis: perfisNavegacao.map((perfil) => ({
      id: perfil.id,
      codigo: perfil.codigo,
      nome: perfil.nome,
      permissoes: perfil.permissoes,
      administrativo: perfil.administrativo,
      excecao: perfil.excecao,
      perfilDestinoExcecaoId: perfil.perfilDestinoExcecaoId,
    })),
  };
  const chavePerfilAtivo = [
    session.user.id,
    perfilAtivo.codigo,
    ...perfilAtivo.permissoes,
    ...permissoesPerfilAtivo,
  ].join("-");

  return (
    <AppShellClient
      key={chavePerfilAtivo}
      usuario={usuario}
      menusPersonalizados={menusPersonalizados}
      iconesItensCatalogo={iconesItensCatalogo}
      favoritosPerfil={favoritosPerfil}
      totalNotificacoes={totalNotificacoes}
      onLogout={logoutAction}
    >
      {children}
    </AppShellClient>
  );
}
