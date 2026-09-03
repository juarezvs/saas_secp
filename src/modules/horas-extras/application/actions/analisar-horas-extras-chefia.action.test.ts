import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  exigirPermissao: vi.fn(),
  listarIdsUnidadesSubordinadasPorUsuario: vi.fn(),
  recalcularDiaServidorService: vi.fn(),
  regerarBancoHorasMesService: vi.fn(),
  prisma: {
    overtimeRequest: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  tx: {
    overtimeFinalDecision: {
      create: vi.fn(),
    },
    overtimeRequest: {
      update: vi.fn(),
    },
    overtimeRequestDay: {
      update: vi.fn(),
    },
    overtimeAuthorization: {
      create: vi.fn(),
    },
    overtimeRequestHistory: {
      create: vi.fn(),
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
  exigirPermissao: mocks.exigirPermissao,
}));

vi.mock(
  "@/modules/chefias/application/services/listar-unidades-subordinadas.service",
  () => ({
    listarIdsUnidadesSubordinadasPorUsuario:
      mocks.listarIdsUnidadesSubordinadasPorUsuario,
  }),
);

vi.mock(
  "@/modules/recalculo/application/services/recalcular-dia-servidor.service",
  () => ({
    recalcularDiaServidorService: mocks.recalcularDiaServidorService,
  }),
);

vi.mock(
  "@/modules/recalculo/application/services/regerar-banco-horas-mes.service",
  () => ({
    regerarBancoHorasMesService: mocks.regerarBancoHorasMesService,
  }),
);

vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: mocks.prisma,
}));

import { analisarHorasExtrasChefiaAction } from "./analisar-horas-extras-chefia.action";

const requestBase = {
  id: "26f29f9e-cf98-4051-8e9b-df491df801f1",
  orgaoId: "9177b387-e549-4f93-8273-ce8a9a21dd1c",
  organizationalUnitId: "35fc59a2-0dfd-42a8-9cd4-80fa8c85c553",
  workflowVersionId: "9177b387-e549-4f93-8273-ce8a9a21dd1c",
  policyVersionId: "26f29f9e-cf98-4051-8e9b-df491df801f1",
  currentWorkflowStepCode: "ANALISE_CHEFIA",
  currentLifecycleStatus: "SUBMITTED",
  employeeId: "2a94bbdd-f200-4f3f-a891-0741f8ad71f7",
  periodStart: new Date("2026-09-01T00:00:00.000Z"),
  periodEnd: new Date("2026-09-02T00:00:00.000Z"),
  approvedAt: null,
  rejectedAt: null,
  days: [
    {
      id: "7edae558-f835-4212-950b-57feb45f8674",
      date: new Date("2026-09-01T00:00:00.000Z"),
      requestedMinutes: 480,
      requestedStartTime: "18:00",
      requestedEndTime: "22:00",
      dayTypeSnapshot: "DIA_UTIL",
      ratePercentSnapshot: null,
    },
  ],
  policyVersion: {
    version: 1,
    divisorMinutes: 12000,
    policy: {
      code: "POLITICA_PADRAO",
    },
    rateRules: [
      {
        dayType: "DIA_UTIL",
        ratePercent: 50,
        active: true,
      },
    ],
  },
  workflowVersion: {
    version: 1,
    definition: {
      code: "FLUXO_SIMPLIFICADO",
    },
  },
};

function formData(action = "APPROVE") {
  const formData = new FormData();

  formData.set("requestId", requestBase.id);
  formData.set("action", action);
  formData.set("reason", "Analise da chefia registrada.");

  return formData;
}

describe("analisarHorasExtrasChefiaAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.exigirPermissao.mockResolvedValue({
      usuarioId: "usuario-chefia",
      usuarioNome: "Chefia",
      perfilAtivoCodigo: "CHEFIA",
      perfilAtivoEscopoGlobal: false,
      orgaoIds: [requestBase.orgaoId],
      permissoes: ["horas-extras:analisar:chefia"],
    });
    mocks.listarIdsUnidadesSubordinadasPorUsuario.mockResolvedValue([
      requestBase.organizationalUnitId,
    ]);
    mocks.prisma.overtimeRequest.findUnique.mockResolvedValue(requestBase);
    mocks.prisma.$transaction.mockImplementation((callback) =>
      callback(mocks.tx),
    );
    mocks.tx.overtimeFinalDecision.create.mockResolvedValue({
      id: "6a4fe0f0-f03a-4c30-a5fa-22d71dbe89cd",
    });
    mocks.tx.overtimeRequest.update.mockResolvedValue({
      ...requestBase,
      currentLifecycleStatus: "APPROVED",
      currentWorkflowStepCode: null,
    });
    mocks.tx.overtimeAuthorization.create.mockResolvedValue({
      id: "d08f2761-ceb9-41bd-bf52-bb9ce35486d2",
    });
  });

  it("defere, cria autorizacao ativa e recalcula o periodo", async () => {
    await expect(
      analisarHorasExtrasChefiaAction({ sucesso: false }, formData()),
    ).rejects.toThrow("NEXT_REDIRECT:/gestao/horas-extras");

    expect(mocks.tx.overtimeRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: requestBase.id },
        data: expect.objectContaining({
          currentLifecycleStatus: "APPROVED",
          currentWorkflowStepCode: null,
          finalDecisionResult: "APPROVED",
        }),
      }),
    );
    expect(mocks.tx.overtimeAuthorization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeId: requestBase.employeeId,
          status: "ACTIVE",
          totalApprovedMinutes: 480,
        }),
      }),
    );
    expect(mocks.recalcularDiaServidorService).toHaveBeenCalledWith(
      expect.objectContaining({
        servidorId: requestBase.employeeId,
        dataReferencia: requestBase.days[0].date,
        origem: "HORAS_EXTRAS_CHEFIA_DEFERIDA",
      }),
    );
    expect(mocks.regerarBancoHorasMesService).toHaveBeenCalledWith(
      expect.objectContaining({
        servidorId: requestBase.employeeId,
        anoReferencia: 2026,
        mesReferencia: 9,
        origem: "HORAS_EXTRAS_CHEFIA_DEFERIDA",
      }),
    );
  });

  it("indefere sem criar autorizacao ou recalcular", async () => {
    mocks.tx.overtimeRequest.update.mockResolvedValue({
      ...requestBase,
      currentLifecycleStatus: "REJECTED",
      currentWorkflowStepCode: null,
    });

    await expect(
      analisarHorasExtrasChefiaAction({ sucesso: false }, formData("REJECT")),
    ).rejects.toThrow("NEXT_REDIRECT:/gestao/horas-extras");

    expect(mocks.tx.overtimeRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentLifecycleStatus: "REJECTED",
          currentWorkflowStepCode: null,
          finalDecisionResult: "REJECTED",
        }),
      }),
    );
    expect(mocks.tx.overtimeAuthorization.create).not.toHaveBeenCalled();
    expect(mocks.recalcularDiaServidorService).not.toHaveBeenCalled();
    expect(mocks.regerarBancoHorasMesService).not.toHaveBeenCalled();
  });
});
