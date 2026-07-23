import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  exigirPermissaoOuRedirecionar: vi.fn(),
  codigoJornadaExiste: vi.fn(),
  tx: {
    jornada: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    jornadaDia: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    jornadaFaixaHorario: {
      createMany: vi.fn(),
    },
    auditoriaEvento: {
      create: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/modules/auth/application/services/permissao.service", () => ({
  exigirPermissaoOuRedirecionar: mocks.exigirPermissaoOuRedirecionar,
}));

vi.mock("../../infrastructure/repositories/jornada.repository", () => ({
  codigoJornadaExiste: mocks.codigoJornadaExiste,
}));

vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(mocks.tx)),
  },
}));

import { criarJornadaAction } from "./criar-jornada.action";

const diasSemana = [
  "DOMINGO",
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
];

function formDataJornadaEscalaCiclica() {
  const formData = new FormData();

  formData.set("codigo", "JORNADA_CICLICA_TESTE");
  formData.set("nome", "Jornada cíclica de teste");
  formData.set("tipo", "ESCALA_CICLICA");
  formData.set("cargaDiariaMinutos", "420");
  formData.set("horarioEntradaPadrao", "08:00");
  formData.set("horarioSaidaPadrao", "15:00");
  formData.set("controlaHorario", "on");
  formData.set("permiteFlexibilidade", "on");
  formData.set("permiteBancoHoras", "on");
  formData.set("ativo", "on");

  for (const dia of diasSemana) {
    const trabalha = !["DOMINGO", "SABADO"].includes(dia);
    formData.set(`dias.${dia}.tipoDia`, trabalha ? "TRABALHO" : "FOLGA");
    formData.set(`dias.${dia}.cargaPrevistaMinutos`, trabalha ? "420" : "0");

    if (trabalha) {
      formData.set(`dias.${dia}.faixaTrabalhoInicio`, "08:00");
      formData.set(`dias.${dia}.faixaTrabalhoFim`, "15:00");
    }
  }

  return formData;
}

describe("criarJornadaAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.exigirPermissaoOuRedirecionar.mockResolvedValue({
      usuarioId: "usuario-1",
    });
    mocks.codigoJornadaExiste.mockResolvedValue(false);
    mocks.tx.jornada.create.mockResolvedValue({
      id: "jornada-1",
      orgaoId: null,
      codigo: "JORNADA_CICLICA_TESTE",
      nome: "Jornada cíclica de teste",
      descricao: null,
      tipo: "ESCALA_CICLICA",
      cargaDiariaMinutos: 420,
      cargaSemanalMinutos: null,
      cargaMensalMinutos: null,
      cargaMinimaDiariaMinutos: null,
      cargaMaximaDiariaMinutos: null,
      controlaHorario: true,
      permiteFlexibilidade: true,
      permiteBancoHoras: true,
      permiteHoraExtra: false,
      exigeIntervalo: false,
      intervaloMinimoMinutos: null,
      intervaloMaximoMinutos: null,
      horarioEntradaPadrao: "08:00",
      horarioSaidaPadrao: "15:00",
      horarioDiferenciadoPermitido: false,
      entradaMinimaDiferenciada: null,
      saidaMaximaDiferenciada: null,
      nucleoObrigatorioInicio: null,
      nucleoObrigatorioFim: null,
      permanenciaMaximaMinutos: null,
      horarioLimiteVirada: null,
      cruzaMeiaNoite: false,
      fundamentoNormativo: null,
      versao: 1,
      vigenciaInicio: null,
      vigenciaFim: null,
      situacao: "ATIVA",
      ativo: true,
    });
    mocks.tx.jornadaDia.createMany.mockResolvedValue({ count: 7 });
    mocks.tx.jornadaDia.findMany.mockResolvedValue(
      diasSemana.map((diaSemana) => ({
        id: `dia-${diaSemana}`,
        diaSemana,
        ordemNoCiclo: null,
      })),
    );
    mocks.tx.jornadaFaixaHorario.createMany.mockResolvedValue({ count: 5 });
    mocks.tx.jornada.findUniqueOrThrow.mockResolvedValue({
      id: "jornada-1",
      orgaoId: null,
      codigo: "JORNADA_CICLICA_TESTE",
      nome: "Jornada cíclica de teste",
      descricao: null,
      tipo: "ESCALA_CICLICA",
      cargaDiariaMinutos: 420,
      cargaSemanalMinutos: null,
      cargaMensalMinutos: null,
      cargaMinimaDiariaMinutos: null,
      cargaMaximaDiariaMinutos: null,
      controlaHorario: true,
      permiteFlexibilidade: true,
      permiteBancoHoras: true,
      permiteHoraExtra: false,
      exigeIntervalo: false,
      intervaloMinimoMinutos: null,
      intervaloMaximoMinutos: null,
      horarioEntradaPadrao: "08:00",
      horarioSaidaPadrao: "15:00",
      horarioDiferenciadoPermitido: false,
      entradaMinimaDiferenciada: null,
      saidaMaximaDiferenciada: null,
      nucleoObrigatorioInicio: null,
      nucleoObrigatorioFim: null,
      permanenciaMaximaMinutos: null,
      horarioLimiteVirada: null,
      cruzaMeiaNoite: false,
      fundamentoNormativo: null,
      versao: 1,
      vigenciaInicio: null,
      vigenciaFim: null,
      situacao: "ATIVA",
      ativo: true,
      dias: [
        {
          diaSemana: "SEGUNDA",
          ordemNoCiclo: null,
          tipoDia: "TRABALHO",
          cargaPrevistaMinutos: 420,
          faixas: [
            {
              tipo: "TRABALHO",
              horaInicio: "08:00",
              horaFim: "15:00",
              obrigatoria: true,
              cruzaMeiaNoite: false,
              ordem: 1,
            },
          ],
        },
      ],
    });
    mocks.tx.auditoriaEvento.create.mockResolvedValue({});
  });

  it("cria faixas da grade com jornadaId para evitar erro de nested create", async () => {
    await expect(
      criarJornadaAction({ sucesso: false, mensagem: null }, formDataJornadaEscalaCiclica()),
    ).rejects.toThrow("NEXT_REDIRECT:/jornadas/jornada-1");

    expect(mocks.tx.jornada.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          dias: expect.anything(),
        }),
      }),
    );
    expect(mocks.tx.jornadaDia.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            jornadaId: "jornada-1",
            diaSemana: "SEGUNDA",
          }),
        ]),
      }),
    );
    expect(mocks.tx.jornadaFaixaHorario.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            jornadaId: "jornada-1",
            jornadaDiaId: "dia-SEGUNDA",
            tipo: "TRABALHO",
            horaInicio: "08:00",
            horaFim: "15:00",
          }),
        ]),
      }),
    );
  });
});
