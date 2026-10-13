import { describe, expect, it, vi } from "vitest";
import { executarMctShadow } from "./executar-mct-shadow.service";

const data = (hora: string) => new Date(`2026-10-13T${hora}:00-04:00`);

describe("executarMctShadow", () => {
  it("persiste somente o resultado shadow e fornece memoria auditavel", async () => {
    const salvarShadow = vi.fn().mockResolvedValue({ id: "execucao-1", criada: true });
    const retorno = await executarMctShadow({
      orgaoId: "orgao-1",
      servidorId: "servidor-1",
      dataReferencia: data("00:00"),
      politica: {
        id: "politica-1",
        versao: 1,
        orgaoId: "orgao-1",
        vigenciaInicio: data("00:00"),
        cargaExigivelMinutos: 420,
        referencia: { inicio: data("08:00"), fim: data("15:00") },
      },
      eventos: [
        { id: "1", ocorridoEm: data("08:20"), tipo: "ENTRADA", fonte: "REP" },
        { id: "2", ocorridoEm: data("18:15"), tipo: "SAIDA", fonte: "REP" },
      ],
      repositorio: { salvarShadow },
    });

    expect(salvarShadow).toHaveBeenCalledOnce();
    expect(salvarShadow.mock.calls[0][0].modo).toBe("SHADOW");
    expect(retorno.resultado.memoriaCalculo).toMatchObject({
      politica: { id: "politica-1", versao: 1 },
      observacao: expect.stringContaining("sem efeitos"),
    });
    expect(retorno.resultado.resultadoJornada.creditoReconhecidoMinutos).toBe(0);
  });

  it("recusa politica de outro orgao", async () => {
    await expect(
      executarMctShadow({
        orgaoId: "orgao-1",
        servidorId: "servidor-1",
        dataReferencia: data("00:00"),
        politica: {
          id: "politica-1",
          versao: 1,
          orgaoId: "orgao-2",
          vigenciaInicio: data("00:00"),
          cargaExigivelMinutos: 420,
        },
        eventos: [],
      }),
    ).rejects.toThrow("nao pertence ao orgao");
  });

  it("aplica plano diario sem confundir abono com trabalho efetivo", async () => {
    const retorno = await executarMctShadow({
      orgaoId: "orgao-1",
      servidorId: "servidor-1",
      dataReferencia: data("00:00"),
      politica: {
        id: "politica-1",
        versao: 1,
        orgaoId: "orgao-1",
        vigenciaInicio: data("00:00"),
        cargaExigivelMinutos: 420,
      },
      plano: {
        dataReferencia: data("00:00"),
        trabalha: true,
        jornadaPrevistaMinutos: 420,
        jornadaExigivelMinutos: 420,
        minutosReconhecidosComoExercicio: 120,
        posicaoCiclo: null,
        codigoDiaCiclo: null,
        ocorrenciasAplicadas: ["abono-medico-parcial"],
      },
      eventos: [
        { id: "1", ocorridoEm: data("08:00"), tipo: "ENTRADA", fonte: "REP" },
        { id: "2", ocorridoEm: data("13:00"), tipo: "SAIDA", fonte: "REP" },
      ],
    });

    expect(retorno.resultado.resultadoJornada).toMatchObject({
      tempoEfetivamenteTrabalhadoMinutos: 300,
      tempoComputavelMinutos: 420,
      tempoFaltanteMinutos: 0,
    });
  });

  it("inclui classificacao e conflitos na memoria sem efeitos oficiais", async () => {
    const retorno = await executarMctShadow({
      orgaoId: "orgao-1",
      servidorId: "servidor-1",
      dataReferencia: data("00:00"),
      politica: {
        id: "politica-1",
        versao: 1,
        orgaoId: "orgao-1",
        vigenciaInicio: data("00:00"),
        cargaExigivelMinutos: 420,
      },
      eventos: [
        { id: "1", ocorridoEm: data("08:00"), tipo: "ENTRADA", fonte: "REP" },
        { id: "2", ocorridoEm: data("16:00"), tipo: "SAIDA", fonte: "REP" },
      ],
      classificacao: {
        catalogo: [
          {
            id: "rubrica-1",
            codigo: "DST-EXCEDENTE-PENDENTE",
            dimensao: "DESTINACAO",
            prioridade: 1,
            exigeAutorizacao: false,
            exigeHomologacao: true,
            efeitoBancoHoras: "NENHUM",
          },
        ],
        regras: [
          {
            id: "excedente-pendente",
            prioridade: 1,
            condicao: {
              campo: "excedenteBrutoMinutos",
              operador: "GT",
              valor: 0,
            },
            efeitos: [
              {
                rubricaCodigo: "DST-EXCEDENTE-PENDENTE",
                escopoTemporal: "excedente",
                quantidade: {
                  estrategia: "CAMPO",
                  campo: "excedenteBrutoMinutos",
                },
              },
            ],
          },
        ],
      },
    });

    expect(retorno.resultado.classificacao?.aplicacoes[0]).toMatchObject({
      codigo: "DST-EXCEDENTE-PENDENTE",
      quantidade: 60,
      status: "PENDENTE_HOMOLOGACAO",
    });
    expect(retorno.resultado.memoriaCalculo).toMatchObject({
      regrasExecutadas: [{ id: "excedente-pendente", satisfeita: true }],
    });
  });
});

