import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutAction } from "@/modules/auth/application/actions/logout.action";
import { buscarServidorPorUsuarioId } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { contarNotificacoesUsuario } from "@/modules/notificacoes/application/notificacoes.service";
import { buscarFotoServidorDataUrl } from "@/modules/servidores/application/services/foto-servidor.service";
import { descricaoFuncaoOuCargoServidor } from "@/modules/servidores/application/services/funcao-cargo-servidor.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { AppShellClient } from "./app-shell-client";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [servidor, totalNotificacoes] = await Promise.all([
    buscarServidorPorUsuarioId(session.user.id, session.user.matricula),
    contarNotificacoesUsuario(session.user.id),
  ]);
  const lotacaoAtual = servidor?.lotacoes[0];
  const perfilAtivo = session.user.perfilAtivo ?? session.user.perfis[0];

  if (!perfilAtivo) {
    redirect("/acesso-negado?motivo=sem-perfil");
  }

  const fotoCpf = servidor?.cpf;
  const fotoUrl = await buscarFotoServidorDataUrl(fotoCpf);
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
    perfilAtivo: {
      codigo: perfilAtivo.codigo,
      nome: perfilAtivo.nome,
      descricao: `${perfilAtivo.permissoes.length} permissão(ões) vinculada(s)`,
      permissoes: perfilAtivo.permissoes,
    },
    perfis: session.user.perfis.map((perfil) => ({
      codigo: perfil.codigo,
      nome: perfil.nome,
      descricao: `${perfil.permissoes.length} permissão(ões) vinculada(s)`,
      permissoes: perfil.permissoes,
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
      totalNotificacoes={totalNotificacoes}
      onLogout={logoutAction}
    >
      {children}
    </AppShellClient>
  );
}
