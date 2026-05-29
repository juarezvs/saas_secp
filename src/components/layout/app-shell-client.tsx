"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import {
  perfilPodeAcessarPath,
  Sidebar,
} from "@/components/layout/sidebar";
import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";

type AppShellClientProps = {
  children: React.ReactNode;
  usuario: {
    nome: string;
    matricula: string;
    perfis: PerfilSessao[];
    perfilAtivo: PerfilSessao | null;
  };
};

export function AppShellClient({ children, usuario }: AppShellClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [perfilAtivo, setPerfilAtivo] = useState<PerfilSessao | null>(
    usuario.perfilAtivo,
  );
  const [alterandoPerfil, setAlterandoPerfil] = useState(false);

  async function handlePerfilAtivoChange(novoPerfil: PerfilSessao) {
    const perfilAnterior = perfilAtivo;

    setPerfilAtivo(novoPerfil);
    setAlterandoPerfil(true);

    try {
      const response = await fetch("/api/sessao/perfil-ativo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ perfilCodigo: novoPerfil.codigo }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível alterar o perfil ativo.");
      }

      const podeContinuarNaRotaAtual = perfilPodeAcessarPath(
        pathname,
        novoPerfil,
      );

      if (!podeContinuarNaRotaAtual) {
        router.push("/dashboard");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      setPerfilAtivo(perfilAnterior);
    } finally {
      setAlterandoPerfil(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex min-h-screen">
        <Sidebar aberta={sidebarAberta} perfilAtivo={perfilAtivo} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            nomeUsuario={usuario.nome}
            matricula={usuario.matricula}
            perfis={usuario.perfis}
            perfilAtivo={perfilAtivo}
            alterandoPerfil={alterandoPerfil}
            onPerfilAtivoChange={handlePerfilAtivoChange}
            onToggleSidebar={() => setSidebarAberta((valor) => !valor)}
          />

          <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
