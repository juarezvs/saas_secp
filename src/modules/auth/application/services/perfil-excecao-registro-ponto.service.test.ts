import { describe, expect, it } from "vitest";
import { aplicarExcecoesRegistroPontoAoPerfilServidor } from "./perfil-excecao-registro-ponto.service";

describe("aplicarExcecoesRegistroPontoAoPerfilServidor", () => {
  it("oculta perfis de excecao e soma as permissoes aos perfis nao administrativos", () => {
    const perfis = aplicarExcecoesRegistroPontoAoPerfilServidor([
      {
        id: "servidor",
        codigo: "SERVIDOR",
        nome: "Servidor",
        permissoes: ["dashboard:visualizar:proprio"],
      },
      {
        id: "excecao-web",
        codigo: "EXCECAO_REGISTRO_WEB",
        nome: "Excecao - Registro web",
        excecao: true,
        perfilDestinoExcecaoId: "servidor",
        permissoes: [
          "marcacoes:registrar:proprio",
          "marcacoes:registrar-web:proprio",
        ],
      },
      {
        id: "chefia",
        codigo: "CHEFIA",
        nome: "Chefia",
        permissoes: ["homologacao:gerenciar:chefia"],
      },
    ]);

    expect(perfis.map((perfil) => perfil.codigo)).toEqual([
      "SERVIDOR",
      "CHEFIA",
    ]);
    expect(perfis[0].permissoes).toContain("dashboard:visualizar:proprio");
    expect(perfis[0].permissoes).toContain("marcacoes:registrar-web:proprio");
    expect(perfis[1].permissoes).toEqual(["homologacao:gerenciar:chefia"]);
  });
});
