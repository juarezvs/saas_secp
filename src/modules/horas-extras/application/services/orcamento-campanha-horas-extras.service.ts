import { createHash } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { possuiAlgumaPermissaoNaLista } from "@/modules/auth/application/services/permissao-utils";
import { minutaCampanhaSjam2026 } from "../../domain/campanha-sjam-2026";
import {
  dinheiroOrcamentario,
  planejarOperacaoOrcamentoHoraExtra,
  type ContaOrcamentariaHoraExtra,
} from "../../domain/orcamento-campanha-horas-extras";
import { operacaoOrcamentoCampanhaSchema, minutaCampanhaSjamSchema } from "../schemas/horas-extras-campanha-orcamento.schema";
import { exigirCampanhasHorasExtrasHabilitadas } from "./campanhas-horas-extras-feature.service";
import { podeAcessarOrgaoHorasExtras, type EscopoHorasExtras } from "./escopo-horas-extras.service";
import { parseIsoDateOnly } from "./horas-extras-datas.service";

export type ContextoOrcamentoCampanha = {
  usuarioId: string;
  perfilAtivoCodigo: string;
  permissoes: string[];
  escopo: EscopoHorasExtras;
};

function exigirAcesso(contexto: ContextoOrcamentoCampanha, orgaoId: string, configurar = false) {
  exigirCampanhasHorasExtrasHabilitadas(orgaoId);
  const acao = configurar ? "configurar-politica" : "responder-orcamento";
  if (!contexto.usuarioId || !contexto.perfilAtivoCodigo ||
    !podeAcessarOrgaoHorasExtras(contexto.escopo, orgaoId) ||
    !possuiAlgumaPermissaoNaLista(contexto.permissoes, [`horas-extras:${acao}:global`, `horas-extras:${acao}:seccional`])) {
    throw new Error("Perfil sem permissao de acao ou escopo para o orcamento da campanha.");
  }
}

async function exigirUnidadesVisiveis(tx: Prisma.TransactionClient, unitIds: string[]) {
  const ocultas = await tx.$queryRaw<Array<{ id: string }>>`
    WITH RECURSIVE ascendentes AS (
      SELECT id, unidade_pai_id, ativo FROM unidades_organizacionais WHERE id IN (${Prisma.join(unitIds)})
      UNION
      SELECT pai.id, pai.unidade_pai_id, pai.ativo FROM unidades_organizacionais pai
      JOIN ascendentes filha ON filha.unidade_pai_id = pai.id
    ) SELECT id FROM ascendentes WHERE NOT ativo
  `;
  if (ocultas.length) throw new Error("Unidade ou unidade superior inativa: operacao indisponivel.");
}

function snapshotConta(conta: {
  id: string; referenceAmount: Prisma.Decimal; allocatedAmount: Prisma.Decimal;
  decentralizedAmount: Prisma.Decimal; reservedAmount: Prisma.Decimal; executedAmount: Prisma.Decimal;
}): ContaOrcamentariaHoraExtra {
  return {
    id: conta.id, referenceAmount: conta.referenceAmount.toFixed(2), allocatedAmount: conta.allocatedAmount.toFixed(2),
    decentralizedAmount: conta.decentralizedAmount.toFixed(2), reservedAmount: conta.reservedAmount.toFixed(2), executedAmount: conta.executedAmount.toFixed(2),
  };
}

/** Contexto deve vir da sessão autenticada; não expor como dados de formulário. */
export async function executarOperacaoOrcamentoCampanha(db: PrismaClient, contexto: ContextoOrcamentoCampanha, dados: unknown) {
  return db.$transaction(tx => executarOperacaoOrcamentoCampanhaEmTransacao(tx, contexto, dados), {maxWait:10000, timeout:20000});
}

export async function executarOperacaoOrcamentoCampanhaEmTransacao(
  tx: Prisma.TransactionClient, contexto: ContextoOrcamentoCampanha, dados: unknown,
) {
  const input = operacaoOrcamentoCampanhaSchema.parse(dados);
  exigirAcesso(contexto, input.orgaoId);
  const valor = dinheiroOrcamentario(input.amount, true).toFixed(2);
  const payloadHash = createHash("sha256").update(JSON.stringify({
    ...input, amount: valor, actorUserId: contexto.usuarioId, activeProfile: contexto.perfilAtivoCodigo,
  })).digest("hex");


    // Lock de campanha serializa saldo, remanejamentos e chaves idempotentes.
    const bloqueadas = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM overtime_campaigns WHERE id = ${input.campaignId}::uuid
      AND orgao_id = ${input.orgaoId}::uuid FOR UPDATE
    `;
    if (!bloqueadas.length) throw new Error("Campanha nao localizada no orgao informado.");
    const campanha = await tx.overtimeCampaign.findUniqueOrThrow({ where: { id: input.campaignId }, include: { orgao: true } });
    if (!campanha.orgao.ativo) throw new Error("Orgao inativo: operacao indisponivel.");
    const anterior = await tx.overtimeBudgetOperation.findUnique({
      where: { campaignId_idempotencyKey: { campaignId: campanha.id, idempotencyKey: input.idempotencyKey } },
      include: { movements: true },
    });
    if (anterior) {
      if (anterior.payloadHash !== payloadHash) throw new Error("Chave idempotente reutilizada com conteudo diferente.");
      const contasAnteriores = await tx.overtimeCampaignAccount.findMany({
        where: { id: { in: anterior.movements.map((movimento) => movimento.accountId) }, campaignId: campanha.id },
      });
      await exigirUnidadesVisiveis(tx, contasAnteriores.map((conta) => conta.unitId));
      return { operation: anterior, replayed: true };
    }
    if (campanha.status !== "ACTIVE") throw new Error("Campanha nao ativa: movimentacao financeira bloqueada.");
    const ids = [input.sourceAccountId, ...(input.destinationAccountId ? [input.destinationAccountId] : [])].sort();
    await tx.$queryRaw`
      SELECT id FROM overtime_campaign_accounts WHERE campaign_id = ${campanha.id}::uuid
      AND id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE
    `;
    const contas = await tx.overtimeCampaignAccount.findMany({ where: { campaignId: campanha.id, id: { in: ids } } });
    if (contas.length !== ids.length) throw new Error("Conta fora da campanha ou nao localizada.");
    await exigirUnidadesVisiveis(tx, contas.map((conta) => conta.unitId));
    const origem = contas.find((conta) => conta.id === input.sourceAccountId)!;
    const destino = contas.find((conta) => conta.id === input.destinationAccountId);
    let reservationRemaining: string | undefined;
    if (input.reservationOperationId) {
      const reserva = await tx.overtimeBudgetOperation.findUnique({
        where: { id: input.reservationOperationId },
        include: { movements: true, consumptions: { include: { movements: true } } },
      });
      if (!reserva || reserva.campaignId !== campanha.id || reserva.type !== "RESERVE" ||
        reserva.movements.length !== 1 || reserva.movements[0].accountId !== origem.id) {
        throw new Error("Reserva de origem nao pertence a esta conta e campanha.");
      }
      reservationRemaining = reserva.consumptions.flatMap((consumo) => consumo.movements)
        .reduce((saldo, movimento) => saldo.plus(movimento.reservedDelta), new Prisma.Decimal(reserva.movements[0].reservedDelta)).toFixed(2);
    }
    const lancamentos = planejarOperacaoOrcamentoHoraExtra({
      type: input.type, amount: valor, source: snapshotConta(origem),
      destination: destino ? snapshotConta(destino) : undefined, reservationRemaining,
    });
    const operation = await tx.overtimeBudgetOperation.create({ data: {
      campaignId: campanha.id, type: input.type, idempotencyKey: input.idempotencyKey, payloadHash,
      reservationOperationId: input.reservationOperationId, actorUserId: contexto.usuarioId,
      activeProfile: contexto.perfilAtivoCodigo, reason: input.reason, seiDocument: input.seiDocument,
      originReference: input.originReference, correlationId: input.correlationId,
      movements: { create: lancamentos.map(({ after: _after, ...lancamento }) => {
        void _after;
        return lancamento;
      }) },
    }, include: { movements: true } });
    for (const lancamento of lancamentos) {
      const { allocatedAmount, decentralizedAmount, reservedAmount, executedAmount } = lancamento.after;
      await tx.overtimeCampaignAccount.update({
        where: { id: lancamento.accountId }, data: { allocatedAmount, decentralizedAmount, reservedAmount, executedAmount },
      });
    }
    await tx.auditoriaEvento.create({ data: {
      usuarioId: contexto.usuarioId, entidade: "OvertimeBudgetOperation", entidadeId: operation.id,
      acao: "HORAS_EXTRAS_ORCAMENTO_MOVIMENTADO",
      dadosAntes: contas.map(snapshotConta), dadosDepois: lancamentos.map((lancamento) => lancamento.after),
      metadados: { perfilAtivo: contexto.perfilAtivoCodigo, correlationId: input.correlationId,
        orgaoId: input.orgaoId, campaignId: campanha.id, type: input.type, seiDocument: input.seiDocument,
        originReference: input.originReference, idempotencyKey: input.idempotencyKey, justificativa: input.reason },
    } });
    return { operation, replayed: false };

}

/** Minuta documental, sem ativação, dotação, descentralização ou reserva. */
export async function cadastrarMinutaCampanhaSjam2026(
  db: PrismaClient, contexto: ContextoOrcamentoCampanha, dados: unknown,
) {
  const input = minutaCampanhaSjamSchema.parse(dados);
  exigirAcesso(contexto, input.orgaoId, true);
  return db.$transaction(async (tx) => {
    const orgao = await tx.orgao.findFirst({ where: { id: input.orgaoId, ativo: true, sigla: "SJAM" } });
    if (!orgao) throw new Error("Minuta documental exclusiva da SJAM ativa.");
    const unidades = await tx.unidadeOrganizacional.findMany({ where: { id: { in: input.unitIds }, orgaoId: orgao.id, ativo: true } });
    if (unidades.length !== input.unitIds.length) throw new Error("Unidades inexistentes, inativas ou fora da SJAM.");
    await exigirUnidadesVisiveis(tx, input.unitIds);
    const minuta = minutaCampanhaSjam2026();
    const referencias = minuta.rules.referenceAmounts;
    const accounts = unidades.map((unidade) => {
      if (!(unidade.tipo in referencias)) throw new Error("Unidade administrativa ou nao classificada exige apreciacao especifica da DIREF.");
      return { unitId: unidade.id, referenceAmount: referencias[unidade.tipo as keyof typeof referencias] };
    });
    const campanha = await tx.overtimeCampaign.create({ data: {
      ...minuta, orgaoId: orgao.id, status: "DRAFT", projectDeadline: parseIsoDateOnly(minuta.projectDeadline),
      proofDeadline: parseIsoDateOnly(minuta.proofDeadline), accounts: { create: accounts },
    } });
    await tx.auditoriaEvento.create({ data: {
      usuarioId: contexto.usuarioId, entidade: "OvertimeCampaign", entidadeId: campanha.id,
      acao: "HORAS_EXTRAS_CAMPANHA_MINUTA_CRIADA", dadosDepois: { code: campanha.code, status: campanha.status, unidades: input.unitIds },
      metadados: { perfilAtivo: contexto.perfilAtivoCodigo, orgaoId: orgao.id, seiDocument: "26097342", saldosFinanceirosIniciais: "0.00" },
    } });
    return campanha;
  });
}
