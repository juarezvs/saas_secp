import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutAction } from "@/modules/auth/application/actions/logout.action";
import { buscarServidorPorUsuarioId } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { contarNotificacoesUsuario } from "@/modules/notificacoes/application/notificacoes.service";
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
    buscarServidorPorUsuarioId(session.user.id),
    contarNotificacoesUsuario(session.user.id),
  ]);
  const lotacaoAtual = servidor?.lotacoes[0];
  const perfilAtivo = session.user.perfilAtivo ?? session.user.perfis[0];

  if (!perfilAtivo) {
    redirect("/acesso-negado?motivo=sem-perfil");
  }

  const usuario = {
    nome: session.user.nome || session.user.name || "Usuário SECP",
    matricula: session.user.matricula,
    unidade:
      lotacaoAtual?.unidade.nome ??
      lotacaoAtual?.unidade.sigla ??
      "",
    perfilAtivo: {
      codigo: perfilAtivo.codigo,
      nome: perfilAtivo.nome,
      descricao: `${perfilAtivo.permissoes.length} permissao(oes) vinculada(s)`,
      permissoes: perfilAtivo.permissoes,
    },
    perfis: session.user.perfis.map((perfil) => ({
      codigo: perfil.codigo,
      nome: perfil.nome,
      descricao: `${perfil.permissoes.length} permissao(oes) vinculada(s)`,
      permissoes: perfil.permissoes,
    })),
  };

  return (
    <AppShellClient
      key={`${session.user.id}-${perfilAtivo.codigo}`}
      usuario={usuario}
      totalNotificacoes={totalNotificacoes}
      onLogout={logoutAction}
    >
      {children}
    </AppShellClient>
  );
}
