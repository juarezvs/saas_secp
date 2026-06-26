import type { PreferenciasAcessibilidade } from "../../application/services/preferencias-acessibilidade.service";

export type PerfilSessao = {
    id: string;
    codigo: string;
    nome: string;
    permissoes: string[];
  };
  
  export type UsuarioAutenticado = {
    id: string;
    matricula: string;
    nome: string;
    email: string | null;
    tipo: string;
    preferenciasAcessibilidade: PreferenciasAcessibilidade;
    perfis: PerfilSessao[];
    perfilAtivo: PerfilSessao | null;
  };
