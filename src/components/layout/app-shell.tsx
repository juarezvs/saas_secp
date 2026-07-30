import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutAction } from "@/modules/auth/application/actions/logout.action";
import { escolherPerfilInicial } from "@/modules/auth/application/services/perfil-servidor-prioritario.service";
import { buscarUsuarioParaLoginPorMatricula } from "@/modules/auth/infrastructure/repositories/usuario-auth.repository";
import { buscarServidorPorUsuarioId } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { contarNotificacoesUsuario } from "@/modules/notificacoes/application/notificacoes.service";
import {
  buscarIconesItensCatalogoMenu,
  buscarMenusPersonalizadosPorPerfil,
} from "@/modules/menus/infrastructure/repositories/menu-personalizado.repository";
import { buscarFotoServidorDataUrl } from "@/modules/servidores/application/services/foto-servidor.service";
import { descricaoFuncaoOuCargoServidor } from "@/modules/servidores/application/services/funcao-cargo-servidor.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { AppShellClient } from "./app-shell-client";

type AppShellProps = {
  children: React.ReactNode;
};

type OrgaoInstitucional = {
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

export async function AppShell({ children }: AppShellProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [usuarioAtualizado, servidor, totalNotificacoes] = await Promise.all([
    buscarUsuarioParaLoginPorMatricula(session.user.matricula),
    buscarServidorPorUsuarioId(session.user.id, session.user.matricula),
    contarNotificacoesUsuario(session.user.id),
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
    }) ?? perfilPreferido;

  if (!perfilAtivo) {
    redirect("/acesso-negado?motivo=sem-perfil");
  }

  const fotoCpf = servidor?.cpf;
  const [fotoUrl, menusPersonalizados, iconesItensCatalogo] = await Promise.all([
    buscarFotoServidorDataUrl(fotoCpf),
    buscarMenusPersonalizadosPorPerfil(perfisNavegacao.map((perfil) => perfil.id)),
    buscarIconesItensCatalogoMenu(),
  ]);
  const orgaoInstitucional =
    lotacaoAtual?.unidade.orgao ?? perfilAtivo.orgaos?.[0] ?? null;
  const usuario = {
    nome:
      nomeServidor(servidor) ||
      session.user.nome ||
      session.user.name ||
      "Usuário SECP",
    matricula: session.user.matricula,
    funcaoOuCargo: descricaoFuncaoOuCargoServidor(servidor),
    fotoUrl,
    preferenciasAcessibilidade: session.user.preferenciasAcessibilidade,
    unidade: lotacaoAtual?.unidade.nome ?? lotacaoAtual?.unidade.sigla ?? "",
    instituicaoLabel: montarRotuloInstituicao(orgaoInstitucional),
    perfilAtivo: {
      id: perfilAtivo.id,
      codigo: perfilAtivo.codigo,
      nome: perfilAtivo.nome,
      permissoes: perfilAtivo.permissoes,
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
  ].join("-");

  return (
    <AppShellClient
      key={chavePerfilAtivo}
      usuario={usuario}
      menusPersonalizados={menusPersonalizados}
      iconesItensCatalogo={iconesItensCatalogo}
      totalNotificacoes={totalNotificacoes}
      onLogout={logoutAction}
    >
      {children}
    </AppShellClient>
  );
}
