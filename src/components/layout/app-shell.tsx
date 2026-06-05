import { AppShellClient } from "./app-shell-client";

type AppShellProps = {
  children: React.ReactNode;
};

const usuarioMock = {
  nome: "Maria Oliveira",
  matricula: "AM12345",
  unidade: "3a Vara Federal do Amazonas",
  perfilAtivo: {
    codigo: "SERVIDOR",
    nome: "Servidor",
    descricao: "Acesso operacional ao controle de ponto",
  },
  perfis: [
    {
      codigo: "SERVIDOR",
      nome: "Servidor",
      descricao: "Acesso operacional ao controle de ponto",
    },
    {
      codigo: "GESTOR",
      nome: "Gestor",
      descricao: "Visualizacao mockada para chefia",
    },
  ],
};

export function AppShell({ children }: AppShellProps) {
  return <AppShellClient usuario={usuarioMock}>{children}</AppShellClient>;
}

