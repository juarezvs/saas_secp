-- CreateEnum
CREATE TYPE "OvertimeCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OvertimeBudgetOperationType" AS ENUM ('ALLOCATE', 'CANCEL_ALLOCATION', 'DECENTRALIZE', 'RETURN_CREDIT', 'RESERVE', 'RELEASE', 'EXECUTE', 'TRANSFER_ALLOCATION', 'TRANSFER_CREDIT');

-- CreateTable
CREATE TABLE "overtime_campaigns" (
    "id" UUID NOT NULL,
    "orgao_id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "sei_process" VARCHAR(80) NOT NULL,
    "authorization_document" VARCHAR(160) NOT NULL,
    "valid_from" DATE,
    "valid_until" DATE,
    "project_deadline" DATE NOT NULL,
    "proof_deadline" DATE NOT NULL,
    "status" "OvertimeCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "rules" JSONB NOT NULL,
    "source_manifest" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_campaign_accounts" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "orgao_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "reference_amount" DECIMAL(14,2) NOT NULL,
    "allocated_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "decentralized_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reserved_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "executed_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_campaign_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_budget_operations" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "type" "OvertimeBudgetOperationType" NOT NULL,
    "idempotency_key" VARCHAR(120) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "reservation_operation_id" UUID,
    "actor_user_id" UUID NOT NULL,
    "active_profile" VARCHAR(120) NOT NULL,
    "reason" TEXT NOT NULL,
    "sei_document" VARCHAR(160) NOT NULL,
    "origin_reference" VARCHAR(160) NOT NULL,
    "correlation_id" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overtime_budget_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_budget_movements" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "allocated_delta" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "decentralized_delta" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reserved_delta" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "executed_delta" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overtime_budget_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "overtime_campaigns_orgao_id_fiscal_year_status_idx" ON "overtime_campaigns"("orgao_id", "fiscal_year", "status");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_campaigns_id_orgao_id_key" ON "overtime_campaigns"("id", "orgao_id");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_campaigns_orgao_id_code_key" ON "overtime_campaigns"("orgao_id", "code");

-- CreateIndex
CREATE INDEX "overtime_campaign_accounts_orgao_id_unit_id_idx" ON "overtime_campaign_accounts"("orgao_id", "unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_campaign_accounts_id_campaign_id_key" ON "overtime_campaign_accounts"("id", "campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_campaign_accounts_campaign_id_unit_id_key" ON "overtime_campaign_accounts"("campaign_id", "unit_id");

-- CreateIndex
CREATE INDEX "overtime_budget_operations_reservation_operation_id_idx" ON "overtime_budget_operations"("reservation_operation_id");

-- CreateIndex
CREATE INDEX "overtime_budget_operations_actor_user_id_idx" ON "overtime_budget_operations"("actor_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_budget_operations_id_campaign_id_key" ON "overtime_budget_operations"("id", "campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_budget_operations_campaign_id_idempotency_key_key" ON "overtime_budget_operations"("campaign_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "overtime_budget_movements_account_id_created_at_idx" ON "overtime_budget_movements"("account_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_budget_movements_operation_id_account_id_key" ON "overtime_budget_movements"("operation_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_organizacionais_id_orgao_id_key" ON "unidades_organizacionais"("id", "orgao_id");

-- AddForeignKey
ALTER TABLE "overtime_campaigns" ADD CONSTRAINT "overtime_campaigns_orgao_id_fkey" FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_campaign_accounts" ADD CONSTRAINT "overtime_campaign_accounts_campaign_id_orgao_id_fkey" FOREIGN KEY ("campaign_id", "orgao_id") REFERENCES "overtime_campaigns"("id", "orgao_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_campaign_accounts" ADD CONSTRAINT "overtime_campaign_accounts_unit_id_orgao_id_fkey" FOREIGN KEY ("unit_id", "orgao_id") REFERENCES "unidades_organizacionais"("id", "orgao_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_budget_operations" ADD CONSTRAINT "overtime_budget_operations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "overtime_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_budget_operations" ADD CONSTRAINT "overtime_budget_operations_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_budget_operations" ADD CONSTRAINT "overtime_budget_operations_reservation_operation_id_campai_fkey" FOREIGN KEY ("reservation_operation_id", "campaign_id") REFERENCES "overtime_budget_operations"("id", "campaign_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_budget_movements" ADD CONSTRAINT "overtime_budget_movements_operation_id_campaign_id_fkey" FOREIGN KEY ("operation_id", "campaign_id") REFERENCES "overtime_budget_operations"("id", "campaign_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_budget_movements" ADD CONSTRAINT "overtime_budget_movements_account_id_campaign_id_fkey" FOREIGN KEY ("account_id", "campaign_id") REFERENCES "overtime_campaign_accounts"("id", "campaign_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Somente estrutura aditiva. Nenhum saldo ou registro histórico é reescrito.
ALTER TABLE overtime_campaigns ADD CONSTRAINT overtime_campaign_dates_check CHECK (
    fiscal_year BETWEEN 1 AND 9999
    AND proof_deadline >= project_deadline
    AND (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
    AND (status <> 'ACTIVE' OR (valid_from IS NOT NULL AND valid_until IS NOT NULL))
);
ALTER TABLE overtime_campaign_accounts ADD CONSTRAINT overtime_campaign_account_balances_check CHECK (
    reference_amount >= 0 AND allocated_amount >= 0 AND decentralized_amount >= 0
    AND reserved_amount >= 0 AND executed_amount >= 0
    AND reserved_amount + executed_amount <= allocated_amount
    AND reserved_amount + executed_amount <= decentralized_amount
);
ALTER TABLE overtime_budget_operations ADD CONSTRAINT overtime_budget_operation_evidence_check CHECK (
    btrim(idempotency_key) <> '' AND btrim(active_profile) <> '' AND btrim(reason) <> ''
    AND btrim(sei_document) <> '' AND btrim(origin_reference) <> '' AND btrim(correlation_id) <> ''
    AND payload_hash ~ '^[0-9a-f]{64}$'
    AND ((type IN ('RELEASE', 'EXECUTE')) = (reservation_operation_id IS NOT NULL))
);
ALTER TABLE overtime_budget_movements ADD CONSTRAINT overtime_budget_movement_nonzero_check CHECK (
    allocated_delta <> 0 OR decentralized_delta <> 0 OR reserved_delta <> 0 OR executed_delta <> 0
);

-- A correção de uma operação financeira gera novos lançamentos, nunca edita a razão.
CREATE FUNCTION impedir_alteracao_razao_orcamentaria_he() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Razao orcamentaria de horas extras imutavel: registre uma nova operacao corretiva.'
    USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER overtime_budget_operations_immutable
BEFORE UPDATE OR DELETE OR TRUNCATE ON overtime_budget_operations
FOR EACH STATEMENT EXECUTE FUNCTION impedir_alteracao_razao_orcamentaria_he();
CREATE TRIGGER overtime_budget_movements_immutable
BEFORE UPDATE OR DELETE OR TRUNCATE ON overtime_budget_movements
FOR EACH STATEMENT EXECUTE FUNCTION impedir_alteracao_razao_orcamentaria_he();
