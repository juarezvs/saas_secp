import { z } from "zod";

export const operacaoOrcamentoCampanhaSchema = z.object({
  orgaoId: z.uuid(),
  campaignId: z.uuid(),
  sourceAccountId: z.uuid(),
  destinationAccountId: z.uuid().optional(),
  reservationOperationId: z.uuid().optional(),
  type: z.enum(["ALLOCATE", "CANCEL_ALLOCATION", "DECENTRALIZE", "RETURN_CREDIT", "RESERVE", "RELEASE", "EXECUTE", "TRANSFER_ALLOCATION", "TRANSFER_CREDIT"]),
  amount: z.string().regex(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/),
  idempotencyKey: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(10).max(4000),
  seiDocument: z.string().trim().min(1).max(160),
  originReference: z.string().trim().min(1).max(160),
  correlationId: z.string().trim().min(1).max(120),
}).superRefine((value, ctx) => {
  const transferencia = value.type === "TRANSFER_ALLOCATION" || value.type === "TRANSFER_CREDIT";
  if (transferencia !== Boolean(value.destinationAccountId) || value.sourceAccountId === value.destinationAccountId) {
    ctx.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Remanejamento exige duas contas distintas; demais operacoes usam apenas a origem." });
  }
  const consumo = value.type === "RELEASE" || value.type === "EXECUTE";
  if (consumo !== Boolean(value.reservationOperationId)) {
    ctx.addIssue({ code: "custom", path: ["reservationOperationId"], message: "Liberacao ou execucao exige a reserva de origem." });
  }
});

export type OperacaoOrcamentoCampanhaInput = z.infer<typeof operacaoOrcamentoCampanhaSchema>;

export const minutaCampanhaSjamSchema = z.object({
  orgaoId: z.uuid(),
  unitIds: z.array(z.uuid()).min(1).max(200).refine((ids) => new Set(ids).size === ids.length, "Unidades duplicadas."),
});
