import type { DefaultSession } from "next-auth";
import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      matricula: string;
      nome: string;
      tipo: string;
      perfis: PerfilSessao[];
      perfilAtivo: PerfilSessao | null;
    } & DefaultSession["user"];
  }

  interface User {
    matricula?: string;
    nome?: string;
    tipo?: string;
    perfis?: PerfilSessao[];
    perfilAtivo?: PerfilSessao | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    matricula?: string;
    nome?: string;
    tipo?: string;
    perfis?: PerfilSessao[];
    perfilAtivo?: PerfilSessao | null;
  }
}
